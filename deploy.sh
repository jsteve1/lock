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

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root or with sudo"
    exit 1
fi

# Get deployment configuration
read -p "Enter domain name (e.g., notes.example.com): " DOMAIN_NAME
read -p "Enter email for SSL certificate: " EMAIL
read -p "Enter desired PostgreSQL password: " DB_PASSWORD
read -sp "Enter desired admin password: " ADMIN_PASSWORD
echo ""

# Generate random secret key
SECRET_KEY=$(openssl rand -hex 32)

# Install dependencies
print_status "Installing dependencies..."
apt-get update
apt-get install -y docker.io docker-compose nginx certbot python3-certbot-nginx

# Start Docker service
print_status "Starting Docker service..."
systemctl start docker
systemctl enable docker

# Create .env file
print_status "Creating environment file..."
cat > .env << EOL
DOMAIN=${DOMAIN_NAME}
SECRET_KEY=${SECRET_KEY}
POSTGRES_PASSWORD=${DB_PASSWORD}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
ADMIN_EMAIL=admin@${DOMAIN_NAME}
ENABLE_HTTPS=true
EOL

# Configure Nginx for SSL
print_status "Configuring Nginx..."
cat > /etc/nginx/sites-available/${DOMAIN_NAME} << EOL
server {
    listen 80;
    server_name ${DOMAIN_NAME};
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOL

ln -sf /etc/nginx/sites-available/${DOMAIN_NAME} /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# Get SSL certificate
print_status "Obtaining SSL certificate..."
certbot --nginx -d ${DOMAIN_NAME} --non-interactive --agree-tos -m ${EMAIL}

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

print_status "Deployment complete! Your application is now running at https://${DOMAIN_NAME}"
print_status "Admin login:"
print_status "Email: admin@${DOMAIN_NAME}"
print_status "Password: [your chosen password]"

print_warning "Important: Make sure to:"
print_warning "1. Configure your DNS to point ${DOMAIN_NAME} to this server's IP"
print_warning "2. Open ports 80 and 443 in your firewall/security group"
print_warning "3. Backup your .env file securely" 