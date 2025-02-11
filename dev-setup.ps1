# PowerShell script for local development setup
$ErrorActionPreference = "Stop"

# Colors for output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Status($message) {
    Write-ColorOutput Green "[+] $message"
}

function Write-Warning($message) {
    Write-ColorOutput Yellow "[*] $message"
}

function Write-Error($message) {
    Write-ColorOutput Red "[!] $message"
}

# Check if running as administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Error "Please run as Administrator"
    exit 1
}

# Check for required tools
Write-Status "Checking required tools..."

# Check Docker
try {
    docker --version | Out-Null
    Write-Status "Docker is installed"
} catch {
    Write-Error "Docker is not installed or not running"
    exit 1
}

# Check OpenSSL
try {
    openssl version | Out-Null
    Write-Status "OpenSSL is installed"
} catch {
    Write-Error "OpenSSL is not installed"
    exit 1
}

# More thorough cleanup before starting
Write-Status "Performing thorough cleanup..."
try {
    docker-compose down -v
    docker ps -q | ForEach-Object { docker stop $_ }
} catch {
    Write-Warning "Cleanup failed, but continuing..."
}

# Check for port conflicts
Write-Status "Checking for port conflicts..."
$portsToCheck = @(8002, 8080, 5432, 6379)
foreach ($port in $portsToCheck) {
    $portInUse = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($portInUse) {
        Write-Error "Port $port is already in use. Please free this port before continuing."
        exit 1
    }
}

# Clean up existing containers and volumes
Write-Status "Cleaning up existing containers and volumes..."
docker-compose down -v
Remove-Item -Path ".\postgres_data" -Recurse -Force -ErrorAction SilentlyContinue

# Generate random passwords and keys
$dbPassword = -join ((48..57) + (97..122) | Get-Random -Count 32 | % {[char]$_})
$adminPassword = -join ((48..57) + (97..122) | Get-Random -Count 12 | % {[char]$_})
$secretKey = -join ((48..57) + (97..122) | Get-Random -Count 32 | % {[char]$_})

# Create SSL directory if it doesn't exist
Write-Status "Setting up SSL certificates..."
New-Item -ItemType Directory -Force -Path .\ssl | Out-Null

# Generate self-signed certificate
$sslConfig = @"
[req]
default_bits = 2048
prompt = no
default_md = sha256
x509_extensions = v3_req
distinguished_name = dn

[dn]
C = US
ST = State
L = City
O = Organization
OU = OrganizationUnit
CN = localhost

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = 127.0.0.1
"@

# Write SSL config
$sslConfig | Out-File -FilePath .\ssl\openssl.cnf -Encoding ascii

# Generate SSL certificate
Write-Status "Generating SSL certificate..."
Set-Location .\ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout key.pem -out cert.pem -config openssl.cnf
Set-Location ..

# Create .env file for local development
Write-Status "Creating .env file..."
@"
DOMAIN=localhost
DOMAIN_NAME=localhost
SECRET_KEY=$secretKey
POSTGRES_PASSWORD=$dbPassword
ADMIN_PASSWORD=$adminPassword
ADMIN_EMAIL=admin@localhost
ENABLE_HTTPS=true
"@ | Out-File -FilePath .env -Encoding ascii

# Create docker-compose.override.yml for local development
Write-Status "Creating Docker Compose override..."
@"
version: '3.8'

services:
  backend:
    environment:
      - CORS_ORIGINS=http://localhost:5173
      - PYTHONUNBUFFERED=1
    ports:
      - "8002:8000"
    volumes:
      - ./ssl:/app/ssl:ro
      - ./src:/app/src
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 256M

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_HOST_AUTH_METHOD=trust
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 256M

  redis:
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 128M

  nginx:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./uploads:/app/uploads:ro
      - ./frontend/dist:/usr/share/nginx/html:ro
    depends_on:
      - backend
"@ | Out-File -FilePath docker-compose.override.yml -Encoding ascii

# Modify nginx.conf for local development (plain HTTP)
Write-Status "Creating nginx configuration..."
@'
events {
    worker_connections 512;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Logging settings
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Basic settings
    sendfile        on;
    keepalive_timeout 65;
    client_max_body_size 100M;

    # Gzip settings
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml;
    gzip_disable "MSIE [1-6]\.";

    map $request_method $cors_method {
        OPTIONS 204;
        default 404;
    }

    # HTTP server
    server {
        listen 80;
        server_name localhost;

        # Global CORS settings
        add_header Access-Control-Allow-Origin "http://localhost:5173" always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS, PUT, DELETE, PATCH" always;
        add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" always;
        add_header Access-Control-Allow-Credentials "true" always;
        add_header Access-Control-Max-Age "1728000" always;

        # Handle preflight requests
        if ($request_method = OPTIONS) {
            return 204;
        }

        # API endpoints with /api prefix
        location /api/ {
            rewrite ^/api/(.*) /$1 break;
            proxy_pass http://backend:8000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection upgrade;
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Direct endpoints without /api prefix (e.g., /users, /token)
        location ~ ^/(users|token) {
            proxy_pass http://backend:8000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection upgrade;
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Serve uploaded files
        location /uploads/ {
            alias /app/uploads/;
            expires 1h;
            add_header Cache-Control "public, no-transform";
        }

        # Serve frontend static files
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
            expires 1h;
            add_header Cache-Control "public, no-transform";
        }
    }
}
'@ | Out-File -FilePath nginx.conf -Encoding ascii

# Create data directories
Write-Status "Creating data directories..."
New-Item -ItemType Directory -Force -Path uploads | Out-Null

# Build frontend
Write-Status "Building frontend..."
Set-Location frontend
npm install
npm run build
Set-Location ..

# Start the application with a more controlled approach
Write-Status "Starting application..."
Write-Status "Starting database first..."
docker-compose up -d db
Start-Sleep -Seconds 5

Write-Status "Starting Redis..."
docker-compose up -d redis
Start-Sleep -Seconds 5

Write-Status "Starting backend..."
docker-compose up -d backend
Start-Sleep -Seconds 5

Write-Status "Starting nginx..."
docker-compose up -d nginx
Start-Sleep -Seconds 5

# Start frontend development server in a new window
Write-Status "Starting frontend development server..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Status "Local development setup complete!"
Write-Status "Your application is now running at:"
Write-Status "- Frontend (Vite): http://localhost:5173"
Write-Status "- API: http://localhost:8080/api"
Write-Status "- API Docs: http://localhost:8080/api/docs"

Write-Warning "Local Development Settings:"
Write-Warning "1. Self-signed certificate is used for internal services but plain HTTP is enabled for API access"
Write-Warning "2. Frontend dev server runs on http://localhost:5173"
Write-Warning "3. API and backend services run on http://localhost:8080"
Write-Warning "4. Database is exposed on localhost:5432"
Write-Warning "5. Redis is exposed on localhost:6379"

Write-Warning "Next Steps:"
Write-Warning "1. Use plain HTTP for API requests during local development"
Write-Warning "2. The frontend dev server has been started in a new window"
Write-Warning "3. Monitor the logs with: docker-compose logs -f"
Write-Warning "4. Admin credentials are in the .env file" 