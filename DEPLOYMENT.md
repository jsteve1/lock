# Deployment Guide

This guide covers deployment options for the Keep Clone application, including AWS EC2 and general self-hosting scenarios.

## Quick Deploy (Automated Script)

For a quick, automated deployment on a fresh Ubuntu server:

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/keepclone.git
   cd keepclone
   ```

2. Make the deployment script executable:
   ```bash
   chmod +x deploy.sh
   ```

3. Run the deployment script:
   ```bash
   sudo ./deploy.sh
   ```

4. Follow the prompts to configure your deployment.

## Manual Deployment Steps

If you prefer to deploy manually or need more control, follow these steps:

### Prerequisites

- A server running Ubuntu 20.04 or later
- Domain name pointing to your server
- Root or sudo access

### 1. System Setup

```bash
# Update system packages
sudo apt-get update
sudo apt-get upgrade -y

# Install required packages
sudo apt-get install -y \
    docker.io \
    docker-compose \
    nginx \
    certbot \
    python3-certbot-nginx
```

### 2. Application Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/keepclone.git
   cd keepclone
   ```

2. Create and configure .env file:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

   Required environment variables:
   ```
   DOMAIN=your-domain.com
   SECRET_KEY=your-secret-key
   POSTGRES_PASSWORD=your-db-password
   ADMIN_PASSWORD=your-admin-password
   ADMIN_EMAIL=admin@your-domain.com
   ENABLE_HTTPS=true
   ```

### 3. SSL Certificate Setup

1. Configure Nginx:
   ```bash
   sudo nano /etc/nginx/sites-available/keepclone
   ```

   Add this configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:8080;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

2. Enable the site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/keepclone /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

3. Obtain SSL certificate:
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

### 4. Application Deployment

1. Start the application:
   ```bash
   docker-compose up -d
   ```

2. Run database migrations:
   ```bash
   docker-compose exec backend alembic upgrade head
   ```

## AWS EC2 Deployment

For deploying on AWS EC2, follow these additional steps:

### 1. EC2 Instance Setup

1. Launch an EC2 instance:
   - Ubuntu Server 20.04 LTS
   - t2.micro (free tier) or t2.small (recommended)
   - At least 20GB storage

2. Configure Security Group:
   - Allow SSH (port 22)
   - Allow HTTP (port 80)
   - Allow HTTPS (port 443)

3. Create an Elastic IP and associate it with your instance

### 2. Domain Configuration

1. In Route 53 (or your DNS provider):
   - Create an A record pointing to your Elastic IP
   - Add a CNAME record for www if desired

### 3. Follow Standard Deployment

Once your EC2 instance is set up, follow either the Quick Deploy or Manual Deployment steps above.

## Maintenance

### Backup

1. Database backup:
   ```bash
   docker-compose exec db pg_dump -U postgres keepclone > backup.sql
   ```

2. File attachments backup:
   ```bash
   tar -czf uploads_backup.tar.gz uploads/
   ```

### Updates

1. Pull latest changes:
   ```bash
   git pull origin main
   ```

2. Rebuild and restart:
   ```bash
   docker-compose down
   docker-compose up -d --build
   docker-compose exec backend alembic upgrade head
   ```

## Troubleshooting

### Common Issues

1. **502 Bad Gateway**
   - Check if containers are running: `docker-compose ps`
   - Check logs: `docker-compose logs`

2. **SSL Certificate Issues**
   - Renew certificate: `sudo certbot renew`
   - Check Nginx config: `sudo nginx -t`

3. **Database Connection Issues**
   - Check if database is running: `docker-compose ps db`
   - Check database logs: `docker-compose logs db`

### Logs

View application logs:
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs db
```

## Security Considerations

1. **Environment Variables**
   - Never commit .env file
   - Use strong passwords
   - Regularly rotate secrets

2. **Updates**
   - Regularly update system packages
   - Keep Docker images updated
   - Monitor security advisories

3. **Firewall**
   - Use UFW or security groups
   - Only open necessary ports
   - Implement rate limiting

4. **Monitoring**
   - Set up logging
   - Monitor system resources
   - Configure alerts for critical events

## Performance Optimization

1. **Nginx Configuration**
   - Enable gzip compression
   - Configure caching
   - Optimize SSL settings

2. **Database Tuning**
   - Regular vacuum
   - Index optimization
   - Connection pooling

3. **Application Settings**
   - Configure Redis caching
   - Optimize worker processes
   - Set appropriate rate limits 