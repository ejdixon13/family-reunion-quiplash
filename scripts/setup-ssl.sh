#!/bin/bash

# SSL Setup Script using Certbot
# Run after deploy.sh and after pointing your domain to the server

set -e

echo "=== SSL Certificate Setup ==="

# Check for domain argument
if [ -z "$1" ]; then
    read -p "Enter your domain (e.g., quiplash.example.com): " DOMAIN
else
    DOMAIN=$1
fi

# Install Certbot
echo "Installing Certbot..."
sudo apt install -y certbot

# Stop nginx temporarily
echo "Stopping nginx..."
docker-compose stop nginx

# Get certificate
echo "Obtaining SSL certificate for ${DOMAIN}..."
sudo certbot certonly --standalone -d ${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN}

# Create ssl directory and copy certs
echo "Setting up certificates..."
mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem nginx/ssl/
sudo chown -R $USER:$USER nginx/ssl

# Update .env with HTTPS
sed -i "s|APP_URL=http://|APP_URL=https://|g" .env

# Update nginx config for HTTPS
cat > nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream nextjs {
        server nextjs:3000;
    }

    upstream partykit {
        server partykit:1999;
    }

    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;

    # HTTP - redirect to HTTPS
    server {
        listen 80;
        server_name _;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS
    server {
        listen 443 ssl http2;
        server_name _;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # Next.js app
        location / {
            limit_req zone=general burst=20 nodelay;

            proxy_pass http://nextjs;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # PartyKit WebSocket
        location /party/ {
            proxy_pass http://partykit/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 86400;
            proxy_send_timeout 86400;
        }

        location /parties/ {
            proxy_pass http://partykit/parties/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 86400;
            proxy_send_timeout 86400;
        }
    }
}
EOF

# Restart all containers
echo "Restarting containers with SSL..."
docker-compose up -d

# Setup auto-renewal
echo "Setting up certificate auto-renewal..."
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/${DOMAIN}/*.pem /var/www/family-quiplash/nginx/ssl/ && docker-compose -f /var/www/family-quiplash/docker-compose.yml restart nginx") | crontab -

echo ""
echo "=== SSL Setup Complete ==="
echo ""
echo "Your app is now available at: https://${DOMAIN}"
echo "Certificates will auto-renew via cron job"
echo ""
