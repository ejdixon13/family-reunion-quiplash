# Deployment Walkthrough

A step-by-step guide to deploying Family Quiplash on a Digital Ocean Droplet.

## Prerequisites

- Digital Ocean account
- SSH key added to Digital Ocean (see [ssh-keys.md](./ssh-keys.md))
- A Droplet created with Ubuntu 22.04 LTS ($6/mo Basic is sufficient)

---

## Step 1: Connect to your Droplet

Open PowerShell and connect (replace with your Droplet's IP):

```powershell
ssh root@YOUR_DROPLET_IP
```

Type `yes` if asked about fingerprint, then you should see a welcome message.

---

## Step 2: Update the system

```bash
apt update && apt upgrade -y
```

This takes a minute or two.

---

## Step 3: Install Docker

```bash
curl -fsSL https://get.docker.com | sh
```

---

## Step 4: Install Docker Compose

```bash
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

Verify it works:

```bash
docker-compose --version
```

---

## Step 5: Create the app directory

```bash
mkdir -p /var/www/family-quiplash
cd /var/www/family-quiplash
```

---

## Step 6: Upload your code

### Option A: If you have a GitHub repo

```bash
git clone https://github.com/YOUR_USERNAME/family-reunion-quiplash.git .
```

### Option B: Upload directly from your computer

Open a NEW PowerShell window on your local machine (keep the SSH one open):

```powershell
cd C:\Users\ED\Documents\projects\family-reunion-quiplash
scp -r * root@YOUR_DROPLET_IP:/var/www/family-quiplash/
```

This copies all files to the server.

---

## Step 7: Create environment file

Back in your SSH terminal:

```bash
cd /var/www/family-quiplash
nano .env
```

Paste this (use your Droplet IP or domain):

```
APP_URL=http://YOUR_DROPLET_IP
PARTYKIT_HOST=YOUR_DROPLET_IP/party
```

Save: `Ctrl+O`, Enter, `Ctrl+X`

---

## Step 8: Build and start

```bash
docker-compose build
```

This takes 2-5 minutes the first time.

Then start everything:

```bash
docker-compose up -d
```

---

## Step 9: Open the firewall

```bash
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```

Type `y` to confirm.

---

## Step 10: Test it!

Open your browser and go to:

```
http://YOUR_DROPLET_IP
```

You should see the Family Quiplash home page!

---

## Quick Reference Commands

```bash
# View logs (live)
docker-compose logs -f

# View logs for specific service
docker-compose logs -f nextjs
docker-compose logs -f partykit

# Check container status
docker-compose ps

# Restart all services
docker-compose restart

# Stop everything
docker-compose down

# Rebuild after code changes
docker-compose build && docker-compose up -d
```

---

## Adding SSL (HTTPS)

If you have a domain name pointed to your Droplet:

```bash
cd /var/www/family-quiplash
chmod +x scripts/setup-ssl.sh
./scripts/setup-ssl.sh your-domain.com
```

This will:
1. Install Certbot
2. Get a Let's Encrypt certificate
3. Configure nginx for HTTPS
4. Set up auto-renewal

---

## Updating the App

### If using Git:

```bash
cd /var/www/family-quiplash
git pull
docker-compose build
docker-compose up -d
```

### If uploading manually:

From your local machine:

```powershell
cd C:\Users\ED\Documents\projects\family-reunion-quiplash
scp -r * root@YOUR_DROPLET_IP:/var/www/family-quiplash/
```

Then on the server:

```bash
cd /var/www/family-quiplash
docker-compose build
docker-compose up -d
```

---

## Troubleshooting

### Can't connect via SSH

- Check your Droplet IP is correct
- Verify SSH key is added to Digital Ocean
- Try: `ssh -v root@YOUR_DROPLET_IP` for verbose output

### Website not loading

```bash
# Check if containers are running
docker-compose ps

# Check logs for errors
docker-compose logs

# Make sure firewall allows port 80
ufw status
```

### WebSocket connection failed

```bash
# Check PartyKit container
docker-compose logs partykit

# Verify nginx is proxying correctly
docker-compose logs nginx
```

### Out of memory

If the $6 Droplet runs out of memory during build:

```bash
# Add swap space
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

Then try building again.
