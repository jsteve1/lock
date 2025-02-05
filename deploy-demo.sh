#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions for printing messages
print_status() {
    echo -e "${GREEN}[+]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[*]${NC} $1"
}

print_error() {
    echo -e "${RED}[!]${NC} $1"
}

# Configuration (update these as needed)
DOMAIN_NAME="lockedin.bidseek.dev"
EMAIL="admin@lockedin.bidseek.dev"
# Generate random passwords if needed (or set manually)
DB_PASSWORD=$(openssl rand -hex 32)
ADMIN_PASSWORD=$(openssl rand -base64 12)
SECRET_KEY=$(openssl rand -hex 32)

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root or using sudo"
    exit 1
fi

# Check memory and set up swap if low memory (<2048MB)
print_status "Checking memory configuration..."
MEMORY=$(free -m | awk '/^Mem:/{print $2}')
if [ "$MEMORY" -lt 2048 ]; then
    print_warning "Low memory detected (${MEMORY}MB). Setting up swap space..."
    if ! swapon --show | grep -q "/swapfile"; then
        fallocate -l 2G /swapfile
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
        print_status "Swap space setup complete"
    else
        print_status "Swap is already enabled"
    fi
else
    print_status "Sufficient memory detected: ${MEMORY}MB"
fi

# OS detection and install dependencies accordingly
print_status "Installing dependencies..."

if grep -qi 'amazon linux' /etc/os-release; then
    print_status "Detected Amazon Linux"
    yum update -y
    yum install -y docker bind-utils nginx python3-pip
    pip3 install certbot certbot-nginx
else
    print_status "Detected Debian/Ubuntu"
    apt-get update -y
    apt-get install -y docker bind-utils nginx python3-pip
    pip3 install certbot certbot-nginx
fi

# Stop the host's nginx service so Docker's nginx container can bind to ports 80 & 443
print_status "Stopping system nginx service to free up ports 80 and 443..."
systemctl stop nginx
systemctl disable nginx

# Install Docker Compose
print_status "Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Check if ports 80 and 443 are available
if lsof -i:80 -sTCP:LISTEN -t >/dev/null || lsof -i:443 -sTCP:LISTEN -t >/dev/null; then
   print_error "Ports 80 and/or 443 are in use. Please free these ports and try again."
   exit 1
fi

# Detect public IP via EC2 metadata service (or prompt)
print_status "Detecting public IP..."
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
if [ -z "$PUBLIC_IP" ]; then
    print_warning "Could not automatically detect EC2 public IP"
    read -p "Please enter your server's public IP address: " PUBLIC_IP
    if [ -z "$PUBLIC_IP" ]; then
        print_error "Public IP is required"
        exit 1
    fi
fi
print_status "Using public IP: ${PUBLIC_IP}"

# DNS configuration check (waits for propagation)
print_warning "Checking DNS configuration for ${DOMAIN_NAME}..."
for i in {1..3}; do
    RESOLVED_IP=$(dig +short ${DOMAIN_NAME} @8.8.8.8)
    if [ "$RESOLVED_IP" == "$PUBLIC_IP" ]; then
         DNS_OK=true
         break
    fi
    print_warning "DNS check attempt $i failed: expected ${PUBLIC_IP}, got ${RESOLVED_IP:-none}"
    sleep 30
done
if [ -z "$DNS_OK" ]; then
    print_warning "DNS may not have propagated fully. SSL certificate setup might fail."
    read -p "Would you like to continue anyway? (y/n) " RESP
    if [[ ! $RESP =~ ^[Yy]$ ]]; then
         print_status "Deployment canceled. Please configure DNS properly."
         exit 1
    fi
fi

# Start Docker service
print_status "Starting services..."
systemctl start docker
systemctl enable docker

# Configure Docker daemon
print_status "Configuring Docker..."
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<EOF
{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "1"
    }
}
EOF
systemctl restart docker

# Create or update .env file
if [ -f .env.example ]; then
    print_status "Found .env.example, using as template..."
    cp .env.example .env
    sed -i "s/DOMAIN=.*/DOMAIN=${DOMAIN_NAME}/" .env
    sed -i "s/SECRET_KEY=.*/SECRET_KEY=${SECRET_KEY}/" .env
    sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=${DB_PASSWORD}/" .env
    sed -i "s/ADMIN_PASSWORD=.*/ADMIN_PASSWORD=${ADMIN_PASSWORD}/" .env
    sed -i "s/ADMIN_EMAIL=.*/ADMIN_EMAIL=${EMAIL}/" .env
    sed -i "s/ENABLE_HTTPS=.*/ENABLE_HTTPS=true/" .env
else
    print_status "Creating new .env file..."
    cat > .env <<EOF
DOMAIN=${DOMAIN_NAME}
SECRET_KEY=${SECRET_KEY}
POSTGRES_PASSWORD=${DB_PASSWORD}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
ADMIN_EMAIL=${EMAIL}
ENABLE_HTTPS=true
EOF
fi

# Create Docker Compose override file for resource limits
print_status "Creating Docker Compose resource limits..."
cat > docker-compose.override.yml <<EOF
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 200M
    environment:
      - WORKERS=1
      - MAX_WORKERS=1
      - WORKER_CONNECTIONS=100
      - MAX_UPLOAD_SIZE=5242880

  db:
    command: postgres -c shared_buffers=64MB -c work_mem=2MB -c maintenance_work_mem=16MB -c temp_file_limit=32MB
    deploy:
      resources:
        limits:
          memory: 150M

  redis:
    command: redis-server --maxmemory 32mb --maxmemory-policy allkeys-lru --save "" --appendonly no
    deploy:
      resources:
        limits:
          memory: 50M

  nginx:
    deploy:
      resources:
        limits:
          memory: 50M
EOF

# Create necessary data directories and set permissions
print_status "Creating data directories..."
mkdir -p /postgres_data /redis_data /uploads
chown -R 1000:1000 /postgres_data /redis_data /uploads

# Configure Nginx – generate a domain-specific configuration without global directives
print_status "Configuring Nginx..."
NGINX_CONF_PATH="/etc/nginx/conf.d/${DOMAIN_NAME}.conf"
cat > ${NGINX_CONF_PATH} <<EOF
# Note: Removed global directives such as "worker_rlimit_nofile" from this file.
limit_req_zone \$binary_remote_addr zone=one:5m rate=60r/m;
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=app_cache:5m max_size=1g inactive=60m use_temp_path=off;

server {
    listen 80;
    server_name ${DOMAIN_NAME};

    gzip on;
    gzip_comp_level 2;
    gzip_min_length 1000;
    gzip_types text/plain text/css application/json application/javascript text_xml application_xml application_xml+rss text_javascript;
    
    client_body_buffer_size 10K;
    client_header_buffer_size 1k;
    client_max_body_size 10m;
    large_client_header_buffers 2 1k;
    
    location / {
        limit_req zone=one burst=10 nodelay;
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_buffers 4 256k;
        proxy_buffer_size 128k;
        proxy_busy_buffers_size 256k;

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            proxy_cache app_cache;
            proxy_cache_use_stale error timeout http_500 http_502 http_503 http_504;
            proxy_cache_valid 200 60m;
            add_header X-Cache-Status \$upstream_cache_status;
            expires 1h;
        }
        
        add_header X-Frame-Options "SAMEORIGIN";
        add_header X-XSS-Protection "1; mode=block";
        add_header X-Content-Type-Options "nosniff";
        add_header Referrer-Policy "strict-origin-when-cross-origin";
        add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:;";
    }
}
EOF

# Remove default nginx config and test new configuration
rm -f /etc/nginx/conf.d/default.conf
nginx -t && systemctl restart nginx

# SSL Certificate Setup
if [ "$SKIP_SSL" != "true" ]; then
    print_status "Obtaining SSL certificate..."
    if certbot --nginx -d ${DOMAIN_NAME} --non-interactive --agree-tos -m ${EMAIL}; then
        print_status "SSL certificate obtained successfully"
    else
        print_error "SSL certificate setup failed"
        print_warning "You can set up SSL later by running: certbot --nginx -d ${DOMAIN_NAME}"
        read -p "Would you like to continue with deployment anyway? (y/n) " RESP_SSL
        if [[ ! $RESP_SSL =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    print_warning "Skipping SSL setup as requested"
fi

# Start the application using Docker Compose
print_status "Starting application..."
docker-compose pull
docker-compose up -d

# Wait for services to be ready
print_status "Waiting for services to start..."
sleep 30

# Run database migrations (if applicable)
print_status "Running database migrations..."
docker-compose exec -T backend alembic upgrade head

# Set up daily cleanup cron job
print_status "Setting up cleanup cron job..."
cat > /etc/cron.daily/cleanup-inactive <<EOF
#!/bin/bash
docker-compose exec -T backend python -m src.scripts.cleanup_inactive_data
EOF
chmod +x /etc/cron.daily/cleanup-inactive

print_status "Portfolio demo deployment complete! Your application is now running at https://${DOMAIN_NAME}"
print_status "Admin credentials (save these somewhere secure):"
print_status "Email: ${EMAIL}"
print_status "Password: $(grep ADMIN_PASSWORD .env | cut -d '=' -f2)"
print_warning "Portfolio Demo Settings:"
print_warning "1. Rate limited to 60 requests per minute with burst allowance"
print_warning "2. Maximum 100 notes per user"
print_warning "3. Maximum 10 attachments per note"
print_warning "4. 10MB maximum attachment size"
print_warning "5. Inactive accounts and data cleaned up after 30 days"
print_warning "6. Static asset caching enabled"
print_warning "7. Gzip compression enabled"
print_warning "Next Steps:"
print_warning "1. Configure your DNS for ${DOMAIN_NAME} to point to this server's IP (${PUBLIC_IP})"
print_warning "2. Save the admin credentials securely"
print_warning "3. Monitor the logs with: docker-compose logs -f" 