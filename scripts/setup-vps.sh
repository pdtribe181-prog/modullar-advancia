#!/bin/bash
# VPS Initial Setup Script for Advancia PayLedger
# Run as root on a fresh Ubuntu 22.04+ VPS
#
# Usage: curl -fsSL https://raw.githubusercontent.com/pdtribe181-prog/modullar-advancia/main/scripts/setup-vps.sh | bash

set -euo pipefail

echo "══════════════════════════════════════════════════════════"
echo "  Advancia PayLedger — VPS Setup"
echo "══════════════════════════════════════════════════════════"

APP_DIR="/var/www/advancia"
REPO_URL="https://github.com/pdtribe181-prog/modullar-advancia.git"

# ── 1. System updates ─────────────────────────────────────────────────────
echo "📦 Updating system packages..."
apt-get update -y && apt-get upgrade -y

# ── 2. Install Node.js 20.x ──────────────────────────────────────────────
echo "📦 Installing Node.js 20..."
if ! command -v node &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
node --version
npm --version

# ── 3. Install PM2 ────────────────────────────────────────────────────────
echo "📦 Installing PM2..."
npm install -g pm2

# ── 4. Install Nginx ──────────────────────────────────────────────────────
echo "📦 Installing Nginx..."
apt-get install -y nginx

# ── 5. Install Certbot for SSL ────────────────────────────────────────────
echo "📦 Installing Certbot..."
apt-get install -y certbot python3-certbot-nginx

# ── 6. Configure firewall ────────────────────────────────────────────────
echo "🔒 Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# ── 7. Clone repository ──────────────────────────────────────────────────
echo "📂 Setting up application..."
if [ -d "$APP_DIR" ]; then
    echo "App directory exists, pulling latest..."
    cd "$APP_DIR"
    git pull origin main
else
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# ── 8. Install deps & build ──────────────────────────────────────────────
echo "📦 Installing backend dependencies..."
npm ci

echo "🛠️ Building backend..."
npm run build

# ── 9. Setup Nginx ────────────────────────────────────────────────────────
echo "🌐 Configuring Nginx..."
cp nginx/advancia.conf /etc/nginx/sites-available/advancia
ln -sf /etc/nginx/sites-available/advancia /etc/nginx/sites-enabled/advancia
rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
nginx -t

# ── 10. Create log directories ────────────────────────────────────────────
mkdir -p /var/log/pm2
mkdir -p /var/log/nginx

# ── 11. Setup .env ────────────────────────────────────────────────────────
if [ ! -f "$APP_DIR/.env" ]; then
    echo "⚠️  No .env file found. Creating from example..."
    if [ -f "$APP_DIR/.env.example" ]; then
        cp "$APP_DIR/.env.example" "$APP_DIR/.env"
        echo "⚠️  IMPORTANT: Edit /var/www/advancia/.env with your actual values!"
    else
        cat > "$APP_DIR/.env" << 'ENVEOF'
NODE_ENV=production
PORT=3000
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
# Primary app origin (password reset, Stripe redirects, identity link callback)
FRONTEND_URL=https://advanciapayledger.com
# Optional: extra CORS origins (PayLedger + Healthcare; code also allows these by default in production)
CORS_ORIGINS=https://advanciapayledger.com,https://www.advanciapayledger.com,https://app.advanciapayledger.com,https://advancia-healthcare.com,https://www.advancia-healthcare.com
APP_URL=https://api.advanciapayledger.com
TRUST_PROXY=true
ENVEOF
        echo "⚠️  IMPORTANT: Edit /var/www/advancia/.env with your actual values!"
    fi
fi

# ── 12. Start with PM2 ────────────────────────────────────────────────────
echo "🚀 Starting application with PM2..."
cd "$APP_DIR"
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup systemd -u root --hp /root

# ── 13. Restart Nginx ─────────────────────────────────────────────────────
echo "🔄 Starting Nginx..."
systemctl restart nginx
systemctl enable nginx

# ── 14. SSL certificates ──────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════════"
echo "  ✅ Setup Complete!"
echo "══════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Edit .env:     nano /var/www/advancia/.env"
echo "  2. Point DNS:     A record for api.advanciapayledger.com → $(curl -s ifconfig.me)"
echo "  3. Get SSL:       certbot --nginx -d api.advanciapayledger.com"
echo "  4. Restart PM2:   cd /var/www/advancia && pm2 reload ecosystem.config.cjs"
echo "  5. Check health:  curl http://localhost:3000/health"
echo ""
