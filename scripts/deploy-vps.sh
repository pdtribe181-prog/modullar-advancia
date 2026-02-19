#!/bin/bash
set -e

# Configuration
APP_DIR="/var/www/advancia"
REPO_URL="https://github.com/pdtribe181-prog/modullar-advancia.git"
BRANCH="main"

echo "🚀 Starting Deployment..."

# 1. Navigate to App Directory
if [ -d "$APP_DIR" ]; then
    cd $APP_DIR
    echo "⬇️ Pulling latest changes..."
    git fetch origin
    git reset --hard origin/$BRANCH
else
    echo "dw Cloning repository..."
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
fi

# 2. Install Backend Dependencies & Build
echo "📦 Installing Backend Dependencies..."
npm ci
echo "🛠️ Building Backend..."
npm run build

# 3. Install Frontend Dependencies & Build
echo "📦 Installing Frontend Dependencies..."
cd frontend
npm ci
echo "🛠️ Building Frontend..."
npm run build
cd ..

# 4. Restart PM2 Process
echo "🔄 Restarting Backend Service..."
pm2 reload ecosystem.config.cjs --env production

# 5. Reload Nginx (Optional, if config changed)
# echo "🔄 Reloading Nginx..."
# sudo systemctl reload nginx

echo "✅ Deployment Complete!"
