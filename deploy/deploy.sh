#!/usr/bin/env bash
# CivilBridge deploy/update script - run this ON THE CONTABO SERVER, from
# inside whichever checkout you're updating:
#
#   cd /var/www/civilbridge-dev   (test changes here first)
#   ./deploy/deploy.sh dev
#
#   cd /var/www/civilbridge-prod  (once verified on dev, promote the same
#                                  commit here)
#   ./deploy/deploy.sh prod
#
# Both checkouts track the same branch (main) - "promoting dev to prod"
# just means: you already ran this in the dev checkout and clicked around
# to confirm it looks right, then you run the exact same command in the
# prod checkout, which pulls that same commit.
#
# What it does, in order: pull latest code -> install any new dependencies
# -> run any new database migrations (against THIS checkout's own
# database - dev and prod each have their own, see server/.env's DB_NAME)
# -> rebuild the frontend -> copy the built frontend where Nginx serves it
# from -> restart the right PM2 process. Safe to re-run any time; each
# step is a no-op if there's nothing new for it to do (git pull with no
# changes, migrate against an up-to-date schema, etc.) - see
# server/src/scripts/migrate.js's own comment for exactly why it's safe
# to run repeatedly.

set -e  # stop immediately if any step fails, instead of continuing half-deployed

ENV="$1"
if [ "$ENV" != "dev" ] && [ "$ENV" != "prod" ]; then
  echo "Usage: ./deploy/deploy.sh [dev|prod]"
  exit 1
fi

PM2_NAME="civilbridge-${ENV}-api"
# A SIBLING directory to the checkout, deliberately NOT nested inside
# client/ - client/ is source code (package.json, src/, node_modules);
# this is only ever the built dist/ output, copied here by rsync below.
# These must never be the same path or overlap: an earlier version of
# this script pointed WEB_ROOT at client/ itself, and `rsync --delete`
# deleted the entire source checkout (package.json, src/, node_modules)
# because it was rsync-ing dist/ into its own parent directory. If you
# hit that, see the README's deploy section for recovery steps.
WEB_ROOT="/var/www/civilbridge-${ENV}-web"

echo "==> Deploying '$ENV' (PM2 process: $PM2_NAME, web root: $WEB_ROOT)"

echo "==> Pulling latest code from GitHub..."
git pull origin main

echo "==> Installing backend dependencies..."
cd server
npm install --omit=dev

echo "==> Running database migrations..."
npm run migrate

echo "==> Restarting backend (PM2)..."
cd ..
pm2 restart "$PM2_NAME" || pm2 start deploy/ecosystem.config.cjs --name "$PM2_NAME"

echo "==> Installing frontend dependencies and building..."
cd client
npm install
npm run build

echo "==> Deploying built frontend to Nginx's web root..."
sudo mkdir -p "$WEB_ROOT"
sudo rsync -a --delete dist/ "$WEB_ROOT/"

cd ..
echo ""
echo "✅ Deploy complete for '$ENV'."
