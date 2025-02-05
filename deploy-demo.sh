#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[+]${NC} $1"
}

print_error() {
    echo -e "${RED}[!]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[*]${NC} $1"
}

# Configuration for portfolio demo instance
DOMAIN_NAME="lockedin.bidseek.dev"
EMAIL="admin@bidseek.dev"
DB_PASSWORD=$(openssl rand -hex 32)
ADMIN_PASSWORD=$(openssl rand -base64 12)  # Generate a random admin password
SECRET_KEY=$(openssl rand -hex 32)

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root or with sudo"
    exit 1
fi

# Check OS and install dependencies
print_status "Checking system requirements..."

# Check memory and setup swap if needed
print_status "Checking memory configuration..."
MEMORY_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
MEMORY_GB=$((MEMORY_KB / 1024 / 1024))
if [ $MEMORY_GB -lt 2 ]; then
    print_warning "Low memory detected (${MEMORY_GB}GB). Setting up swap space..."
    
    # Check if swap is already enabled
    if free | awk '/^Swap:/ {exit !$2}'; then
        print_status "Swap is already enabled"
    else
        # Create and enable 2GB swap file
        print_status "Creating 2GB swap file..."
        fallocate -l 2G /swapfile
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
        
        # Configure swappiness
        echo 'vm.swappiness=60' >> /etc/sysctl.conf
        sysctl -p
        
        print_status "Swap space setup complete"
    fi
fi

# Install dependencies for Amazon Linux
print_status "Installing dependencies..."
yum update -y
yum install -y docker bind-utils nginx

# Install Docker Compose
print_status "Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install certbot
print_status "Installing certbot..."
yum install -y python3-pip
pip3 install certbot certbot-nginx

# Check if ports 80 and 443 are available
if lsof -Pi :80 -sTCP:LISTEN -t >/dev/null || lsof -Pi :443 -sTCP:LISTEN -t >/dev/null; then
    print_error "Ports 80 or 443 are already in use. Please free these ports first."
    exit 1
fi

# Check AWS EC2 security group settings
print_warning "Please ensure your EC2 security group has the following inbound rules:"
print_warning "- Port 22 (SSH) from your IP"
print_warning "- Port 80 (HTTP) from anywhere"
print_warning "- Port 443 (HTTPS) from anywhere"
echo ""
read -p "Have you configured these security group settings? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_error "Please configure security group settings first"
    exit 1
fi

# Get public IP
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

# Check DNS settings and wait for propagation
print_warning "Checking DNS configuration for ${DOMAIN_NAME}..."
print_warning "Your server's public IP is: ${PUBLIC_IP}"

DNS_CHECK_PASSED=false
for i in {1..3}; do
    RESOLVED_IP=$(dig +short ${DOMAIN_NAME} @8.8.8.8)
    if [ "$RESOLVED_IP" = "$PUBLIC_IP" ]; then
        DNS_CHECK_PASSED=true
        break
    else
        print_warning "DNS check attempt $i/3 failed. Waiting 30 seconds..."
        print_warning "Expected: ${PUBLIC_IP}, Got: ${RESOLVED_IP:-none}"
        sleep 30
    fi
done

if [ "$DNS_CHECK_PASSED" = false ]; then
    print_warning "DNS has not propagated yet. This is normal and might take up to 24 hours."
    print_warning "Please ensure you have set up an A record for ${DOMAIN_NAME} pointing to ${PUBLIC_IP}"
    read -p "Would you like to continue anyway? This means SSL setup might fail. (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Deployment cancelled. Please try again after DNS has propagated."
        exit 1
    fi
    
    print_warning "Continuing without verified DNS. SSL certificate setup might fail."
    read -p "Would you like to skip SSL setup for now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        SKIP_SSL=true
        print_warning "SSL setup will be skipped. You can run certbot manually later."
    fi
fi

# Start and enable services
print_status "Starting services..."
systemctl start docker
systemctl enable docker
systemctl start nginx
systemctl enable nginx

# Configure minimal Docker settings
print_status "Configuring Docker..."
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << EOL
{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "1"
    }
}
EOL

# Restart Docker to apply changes
systemctl restart docker

# Check for .env.example and create .env
if [ -f .env.example ]; then
    print_status "Found .env.example, using as template..."
    cp .env.example .env
    # Replace values in .env
    sed -i "s#DOMAIN=.*#DOMAIN=${DOMAIN_NAME}#g" .env
    sed -i "s#SECRET_KEY=.*#SECRET_KEY=${SECRET_KEY}#g" .env
    sed -i "s#POSTGRES_PASSWORD=.*#POSTGRES_PASSWORD=${DB_PASSWORD}#g" .env
    sed -i "s#ADMIN_PASSWORD=.*#ADMIN_PASSWORD=${ADMIN_PASSWORD}#g" .env
    sed -i "s#ADMIN_EMAIL=.*#ADMIN_EMAIL=admin@${DOMAIN_NAME}#g" .env
    sed -i "s#ENABLE_HTTPS=.*#ENABLE_HTTPS=true#g" .env
    
    # Add portfolio specific settings if not present
    grep -q "PORTFOLIO_MODE" .env || echo "PORTFOLIO_MODE=true" >> .env
    grep -q "RATE_LIMIT_PER_MINUTE" .env || echo "RATE_LIMIT_PER_MINUTE=60" >> .env
    grep -q "MAX_NOTES_PER_USER" .env || echo "MAX_NOTES_PER_USER=100" >> .env
    grep -q "MAX_ATTACHMENTS_PER_NOTE" .env || echo "MAX_ATTACHMENTS_PER_NOTE=10" >> .env
    grep -q "MAX_ATTACHMENT_SIZE" .env || echo "MAX_ATTACHMENT_SIZE=10485760" >> .env
    grep -q "CLEANUP_DAYS" .env || echo "CLEANUP_DAYS=30" >> .env
    grep -q "REGISTRATION_ENABLED" .env || echo "REGISTRATION_ENABLED=true" >> .env
else
    print_status "Creating new .env file..."
    cat > .env << EOL
DOMAIN=${DOMAIN_NAME}
SECRET_KEY=${SECRET_KEY}
POSTGRES_PASSWORD=${DB_PASSWORD}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
ADMIN_EMAIL=admin@${DOMAIN_NAME}
ENABLE_HTTPS=true
PORTFOLIO_MODE=true
RATE_LIMIT_PER_MINUTE=60
MAX_NOTES_PER_USER=100
MAX_ATTACHMENTS_PER_NOTE=10
MAX_ATTACHMENT_SIZE=10485760
CLEANUP_DAYS=30
REGISTRATION_ENABLED=true
EOL
fi

# Create docker-compose override for minimal resources
print_status "Creating Docker Compose resource limits..."
cat > docker-compose.override.yml << EOL
version: '3.8'

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
EOL

# Create necessary directories with minimal sizes
print_status "Creating data directories..."
mkdir -p /postgres_data /redis_data /uploads
chown -R 1000:1000 /postgres_data /redis_data /uploads

# Configure Nginx with low-memory settings (Amazon Linux paths)
print_status "Configuring Nginx..."
mkdir -p /etc/nginx/conf.d
cat > /etc/nginx/conf.d/${DOMAIN_NAME}.conf << EOL
# Optimize worker processes for low memory
worker_processes auto;
worker_rlimit_nofile 2048;
events {
    worker_connections 1024;
    multi_accept off;
}

# Configure rate limiting
limit_req_zone \$binary_remote_addr zone=one:5m rate=60r/m;
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=app_cache:5m max_size=1g inactive=60m use_temp_path=off;

server {
    listen 80;
    server_name ${DOMAIN_NAME};
    
    # Enable gzip compression
    gzip on;
    gzip_comp_level 2;
    gzip_min_length 1000;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Client buffer size optimizations
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
        
        # Optimize proxy buffers
        proxy_buffers 4 256k;
        proxy_buffer_size 128k;
        proxy_busy_buffers_size 256k;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            proxy_cache app_cache;
            proxy_cache_use_stale error timeout http_500 http_502 http_503 http_504;
            proxy_cache_valid 200 60m;
            add_header X-Cache-Status \$upstream_cache_status;
            expires 1h;
        }
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN";
        add_header X-XSS-Protection "1; mode=block";
        add_header X-Content-Type-Options "nosniff";
        add_header Referrer-Policy "strict-origin-when-cross-origin";
        add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:;";
    }
}
EOL

# Remove default nginx config and restart
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
        read -p "Would you like to continue with deployment anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    print_warning "Skipping SSL setup as requested"
    print_warning "You can set up SSL later by running: certbot --nginx -d ${DOMAIN_NAME}"
fi

# Start application
print_status "Starting application..."
docker-compose pull
docker-compose up -d

# Wait for services to be ready
print_status "Waiting for services to start..."
sleep 30

# Run migrations
print_status "Running database migrations..."
docker-compose exec -T backend alembic upgrade head

# Set up automatic cleanup of inactive accounts/data
print_status "Setting up cleanup cron job..."
cat > /etc/cron.daily/cleanup-inactive << EOL
#!/bin/bash
docker-compose exec -T backend python -m src.scripts.cleanup_inactive_data
EOL
chmod +x /etc/cron.daily/cleanup-inactive

print_status "Portfolio demo deployment complete! Your application is now running at https://${DOMAIN_NAME}"
print_status "Admin credentials (save these somewhere secure):"
print_status "Email: admin@${DOMAIN_NAME}"
print_status "Password: ${ADMIN_PASSWORD}"

print_warning "Portfolio Demo Settings:"
print_warning "1. Rate limited to 60 requests per minute with burst allowance"
print_warning "2. Maximum 100 notes per user"
print_warning "3. Maximum 10 attachments per note"
print_warning "4. 10MB maximum attachment size"
print_warning "5. Inactive accounts and data cleaned up after 30 days"
print_warning "6. Static asset caching enabled"
print_warning "7. Gzip compression enabled"

print_warning "Next Steps:"
print_warning "1. Configure your DNS to point ${DOMAIN_NAME} to this server's IP"
print_warning "2. Save the admin credentials securely"
print_warning "3. Monitor the logs with: docker-compose logs -f" 