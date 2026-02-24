#!/bin/bash
set -e

# Configuration
APP_DIR="/var/www/advancia"
REPO_URL="https://github.com/pdtribe181-prog/modullar-advancia.git"
BRANCH="main"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "══════════════════════════════════════════════════════════"
echo "  Advancia PayLedger — Deploy ($TIMESTAMP)"
echo "══════════════════════════════════════════════════════════"

# 1. Navigate to App Directory
if [ -d "$APP_DIR" ]; then
    cd $APP_DIR
    echo "⬇️  Pulling latest changes..."
    git fetch origin
    PREV_SHA=$(git rev-parse HEAD)
    git reset --hard origin/$BRANCH
    NEW_SHA=$(git rev-parse HEAD)
    echo "    Previous: $PREV_SHA"
    echo "    Current:  $NEW_SHA"
else
    echo "📂 Cloning repository..."
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
fi

# 2. Install Backend Dependencies & Build
echo "📦 Installing Backend Dependencies..."
npm ci --ignore-scripts
echo "🛠️  Building Backend..."
npm run build

# 3. Install Frontend Dependencies & Build
echo "📦 Installing Frontend Dependencies..."
cd frontend
npm ci
echo "🛠️  Building Frontend..."
npm run build
cd ..

# 4. Update Nginx config if changed
if ! diff -q config/nginx/advancia.conf /etc/nginx/sites-available/advancia >/dev/null 2>&1; then
    echo "🌐 Nginx config changed, updating..."
    cp config/nginx/advancia.conf /etc/nginx/sites-available/advancia
    nginx -t && systemctl reload nginx
fi

# 5. Restart PM2 Process
echo "🔄 Restarting Backend Service..."
pm2 reload ecosystem.config.cjs --env production

# 6. Health check
echo "🏥 Running health check..."
sleep 3
for i in 1 2 3 4 5; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null || echo "000")
    if [ "$STATUS" = "200" ]; then
        echo "✅ Health check passed (attempt $i)"
        break
    fi
    if [ "$i" = "5" ]; then
        echo "❌ Health check failed after 5 attempts"
        echo "   Logs: pm2 logs advancia-api --lines 50"
        exit 1
    fi
    echo "   Attempt $i/5 — HTTP $STATUS, retrying in 5s..."
    sleep 5
done

echo ""
echo "══════════════════════════════════════════════════════════"
echo "  ✅ Deployment Complete! ($TIMESTAMP)"
echo "══════════════════════════════════════════════════════════"
