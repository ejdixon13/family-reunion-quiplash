#!/bin/bash

# Family Quiplash - Digital Ocean Deployment Script
# Run this on your Droplet after cloning the repo

set -e

echo "=== Family Quiplash Deployment ==="

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "Please run as a regular user with sudo access, not root"
    exit 1
fi

# Update system
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "Docker installed. Please log out and back in, then run this script again."
    exit 0
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    read -p "Enter your domain (e.g., quiplash.example.com): " DOMAIN

    cat > .env << EOF
APP_URL=http://${DOMAIN}
PARTYKIT_HOST=${DOMAIN}/party
EOF
    echo ".env file created"
fi

# Build and start containers
echo "Building and starting containers..."
docker-compose build
docker-compose up -d

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Your app is running at: http://$(curl -s ifconfig.me)"
echo ""
echo "Next steps:"
echo "1. Point your domain to this server's IP"
echo "2. Run ./scripts/setup-ssl.sh to enable HTTPS"
echo ""
