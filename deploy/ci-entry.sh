#!/usr/bin/env bash
# The ONLY thing GitHub's deploy key is allowed to run on the server.
#
# It is installed once, owned by root (so a code change in the repo can never
# widen what the key may do), and wired into ~/.ssh/authorized_keys as a forced
# command - see docs/DEPLOY_AUTOMATION.md. Whatever GitHub types after `ssh
# host ...` arrives here as $SSH_ORIGINAL_COMMAND, and the only values accepted
# are "dev" and "prod". Everything else is refused, so the key can't open a
# shell, copy files, or run any other command.
#
# What it does: take a lock (no two deploys at once), run the normal
# deploy/deploy.sh for that environment, then check the API really came back
# up - so a deploy that "finished" but left the site broken fails loudly
# instead of looking green.

set -euo pipefail

# sshd runs forced commands with a bare PATH; re-run inside a login shell so
# node / npm / pm2 (often installed via nvm or a profile script) are found.
if [ -z "${CB_LOGIN_SHELL:-}" ]; then
  export CB_LOGIN_SHELL=1
  exec bash -lc "\"$0\""
fi

TARGET="${SSH_ORIGINAL_COMMAND:-}"
case "$TARGET" in
  dev)  DIR=/var/www/civilbridge-dev;  PORT=5001; PM2_NAME=civilbridge-dev-api ;;
  prod) DIR=/var/www/civilbridge-prod; PORT=5000; PM2_NAME=civilbridge-prod-api ;;
  *)
    echo "Refused: this key can only run 'dev' or 'prod' (got: '${TARGET:0:40}')." >&2
    exit 1
    ;;
esac

exec 9>/tmp/civilbridge-deploy.lock
if ! flock -n 9; then
  echo "Another deploy is already running - try again in a minute." >&2
  exit 1
fi

echo "==> $(date -u +%FT%TZ)  deploying '$TARGET' from $DIR"
cd "$DIR"
./deploy/deploy.sh "$TARGET"

echo "==> Checking the API is healthy on port $PORT..."
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1; then
    echo "✅ '$TARGET' is up and answering."
    exit 0
  fi
  sleep 2
done

echo "❌ Deployed, but the API did not answer on port $PORT within 60 seconds." >&2
pm2 logs "$PM2_NAME" --lines 40 --nostream >&2 || true
exit 1
