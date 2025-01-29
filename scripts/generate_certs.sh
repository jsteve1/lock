#!/bin/bash

# Create SSL directory if it doesn't exist
mkdir -p ssl

# Generate private key
openssl genrsa -out ssl/nginx.key 2048

# Generate CSR (Certificate Signing Request)
openssl req -new -key ssl/nginx.key -out ssl/nginx.csr -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Generate self-signed certificate
openssl x509 -req -days 365 -in ssl/nginx.csr -signkey ssl/nginx.key -out ssl/nginx.crt

# Set proper permissions
chmod 600 ssl/nginx.key
chmod 644 ssl/nginx.crt

echo "Self-signed certificates generated successfully in the ssl directory." 