# Deploying Family Quiplash to Digital Ocean

Full documentation is available in the [docs](./docs) folder:

- [SSH Keys Guide](./docs/ssh-keys.md) - What SSH keys are and how to set them up
- [Deployment Walkthrough](./docs/deployment-walkthrough.md) - Step-by-step guide
- [Deployment Reference](./docs/deployment-reference.md) - Quick reference

---

## Quick Start (Docker)

### 1. Create a Droplet

- Go to Digital Ocean → Create → Droplets
- Choose: **Ubuntu 22.04 LTS**
- Plan: **Basic $6/mo** (1GB RAM, 1 CPU) is sufficient
- Choose a datacenter region close to your users
- Add your SSH key
- Create Droplet

### 2. Connect to Your Droplet

```bash
ssh root@YOUR_DROPLET_IP
```

### 3. Create a Deploy User

```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

### 4. Clone and Deploy

```bash
cd /var/www
sudo mkdir family-quiplash
sudo chown deploy:deploy family-quiplash
cd family-quiplash

# Clone your repo (or copy files)
git clone https://github.com/YOUR_USERNAME/family-reunion-quiplash.git .

# Run deployment script
chmod +x scripts/*.sh
./scripts/deploy.sh
```

### 5. (Optional) Setup SSL

Point your domain to the Droplet IP, then:

```bash
./scripts/setup-ssl.sh your-domain.com
```

## Manual Deployment (PM2)

If you prefer not to use Docker:

### 1. Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Install PM2

```bash
sudo npm install -g pm2
```

### 3. Build and Run

```bash
cd /var/www/family-quiplash
npm install
npm run build

# Copy static files to standalone
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. Setup Nginx (without Docker)

```bash
sudo apt install -y nginx

# Copy nginx config
sudo cp nginx/nginx.conf /etc/nginx/nginx.conf

# Update upstream servers to use localhost
sudo sed -i 's/nextjs:3000/127.0.0.1:3000/g' /etc/nginx/nginx.conf
sudo sed -i 's/partykit:1999/127.0.0.1:1999/g' /etc/nginx/nginx.conf

sudo nginx -t
sudo systemctl restart nginx
```

## Environment Variables

Create a `.env` file:

```env
APP_URL=https://your-domain.com
PARTYKIT_HOST=your-domain.com/party
```

## Firewall Setup

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## Monitoring

### Docker

```bash
# View logs
docker-compose logs -f

# Check status
docker-compose ps

# Restart services
docker-compose restart
```

### PM2

```bash
# View logs
pm2 logs

# Check status
pm2 status

# Restart
pm2 restart all
```

## Updating

### Docker

```bash
git pull
docker-compose build
docker-compose up -d
```

### PM2

```bash
git pull
npm install
npm run build
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/
pm2 restart all
```

## Troubleshooting

### WebSocket Connection Failed

- Check nginx is proxying `/party/` correctly
- Verify PartyKit container is running: `docker-compose logs partykit`
- Check firewall allows connections

### 502 Bad Gateway

- Check if Next.js container is running: `docker-compose logs nextjs`
- Verify port 3000 is exposed

### SSL Certificate Issues

- Ensure domain DNS is pointing to server
- Check Certbot logs: `sudo certbot certificates`
- Verify nginx can read certs: check file permissions in `nginx/ssl/`

## Cost Estimate

- **Basic Droplet ($6/mo)**: Good for 20-30 concurrent players
- **Regular Droplet ($12/mo)**: Better for 50+ concurrent players
- **Domain**: ~$10-15/year
- **Total**: ~$7-15/month
