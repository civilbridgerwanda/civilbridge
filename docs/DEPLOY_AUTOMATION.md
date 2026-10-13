# Automatic deploys (GitHub → your Contabo server)

After this is set up: every push to `main` is built and checked by GitHub and,
if it passes, deployed to the **dev** site automatically. **Production is only
ever deployed by you, on purpose**, with one click and a confirmation word.

```
you push ──► GitHub builds + checks the code ──► ssh "dev" ──► server runs deploy.sh dev ──► health check
                         │ fails? stops here, nothing is deployed
you click "Run workflow" (prod + type PROD) ───► ssh "prod" ──► server runs deploy.sh prod ──► health check
```

## Why it's safe

- GitHub holds **one dedicated SSH key**. It isn't your login key and it can't be
  used for anything else: on the server it is locked to a single root-owned
  script (`/usr/local/bin/civilbridge-ci-deploy`) that accepts only the words
  `dev` or `prod`. It can't open a shell, copy files or run any other command.
- A code change in the repo can't widen what the key may do, because the script
  it runs lives outside the repo, owned by root.
- The server's identity is pinned (`DEPLOY_KNOWN_HOSTS`), so GitHub can't be
  tricked into deploying to an impostor.
- The deploy refuses to run twice at once, and fails loudly if the API doesn't
  answer after restarting - a "green" run means the site really came back.
- To switch it all off instantly: delete the one `authorized_keys` line (step 3).

Nothing here touches your `server/.env`, your database contents or your uploaded
files - `deploy.sh` only pulls code, installs, migrates the schema, rebuilds and
restarts, exactly as when you run it by hand.

---

## Part 1 - On the server (once). Replace `<DEPLOY_USER>` with the user that owns `/var/www/civilbridge-*` (called `youruser` in the README).

**1. Get this version of the code onto the server** (both checkouts):

```bash
cd /var/www/civilbridge-dev  && git pull origin main
cd /var/www/civilbridge-prod && git pull origin main
```

**2. Install the locked-down deploy script** (needs sudo; repeat only if `deploy/ci-entry.sh` ever changes):

```bash
cd /var/www/civilbridge-prod
sudo install -m 755 -o root -g root deploy/ci-entry.sh /usr/local/bin/civilbridge-ci-deploy
sudo restorecon -v /usr/local/bin/civilbridge-ci-deploy      # AlmaLinux/SELinux housekeeping
command -v flock curl                                         # both must print a path
```

**3. Create the deploy key - on YOUR computer, not the server** (PowerShell or any terminal):

```bash
ssh-keygen -t ed25519 -f civilbridge-deploy -N "" -C "github-actions-deploy"
```

This makes two files: `civilbridge-deploy` (the **private** key - goes into GitHub
only) and `civilbridge-deploy.pub` (the public half - goes on the server).

Now put the **public** half on the server, locked to the script from step 2. Open
`~/.ssh/authorized_keys` as `<DEPLOY_USER>` and add ONE new line, replacing the
`ssh-ed25519 AAAA...` part with the full contents of `civilbridge-deploy.pub`:

```
restrict,command="/usr/local/bin/civilbridge-ci-deploy" ssh-ed25519 AAAA...yourkey... github-actions-deploy
```

(`restrict` switches off terminals, port-forwarding and everything else; `command=`
forces that one script no matter what is asked.)

**4. Let `deploy.sh` run its two `sudo` lines without a password.** `deploy.sh` uses
`sudo mkdir` and `sudo rsync` to publish the website. Allow exactly those and
nothing more:

```bash
command -v mkdir rsync        # note the two paths - normally /usr/bin/mkdir and /usr/bin/rsync
sudo visudo -f /etc/sudoers.d/civilbridge-deploy
```

Paste this (swap `<DEPLOY_USER>`, and the paths if yours differ), save, exit:

```
<DEPLOY_USER> ALL=(root) NOPASSWD: /usr/bin/mkdir -p /var/www/civilbridge-dev-web, /usr/bin/mkdir -p /var/www/civilbridge-prod-web, /usr/bin/rsync -a --delete dist/ /var/www/civilbridge-dev-web/, /usr/bin/rsync -a --delete dist/ /var/www/civilbridge-prod-web/
```

`visudo` refuses to save a rule with a syntax error, so a typo can't lock you out.

**5. Find the server's fingerprint line** (on your computer; `22` is the SSH port, change if yours differs):

```bash
ssh-keyscan -p 22 <SERVER_IP>
```

Copy the whole output (2-3 lines starting with your IP). To be sure nobody is
intercepting it, you can compare with the server's own:
`ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` (run on the server).

---

## Part 2 - In GitHub (once)

Repository → **Settings → Secrets and variables → Actions → New repository secret**. Add:

| Name | Value |
|---|---|
| `DEPLOY_HOST` | the server's IP address (or `civil-bridge.com`) |
| `DEPLOY_USER` | `<DEPLOY_USER>` |
| `DEPLOY_SSH_KEY` | the **entire** contents of the private file `civilbridge-deploy`, including the `-----BEGIN` and `-----END` lines |
| `DEPLOY_KNOWN_HOSTS` | the output you copied in step 5 |
| `DEPLOY_PORT` | only if SSH isn't on port 22 |

Then **delete `civilbridge-deploy` (the private file) from your computer** - GitHub
now holds the only copy. (If you ever lose it, just make a new key and replace the
`authorized_keys` line and the secret.)

Optional but recommended: **Settings → Environments → production → Required
reviewers → add yourself.** (GitHub only offers this on public repos or paid
plans - the PROD confirmation word below protects you either way.)

---

## Part 3 - Try it

1. **Dev:** GitHub → **Actions → Check & Deploy → Run workflow → target `dev`**.
   You should see *Build & sanity check* then *Deploy* go green, ending in
   "✅ 'dev' is up and answering." Open the dev site to confirm.
2. **Prod (when dev looks right):** **Actions → Check & Deploy → Run workflow →
   target `prod`, type `PROD` in the confirm box.** Same checks, then the live site updates.

From now on, a normal `git push` to `main` updates dev by itself. Add
`[skip deploy]` to a commit message to push without deploying.

---

## Part 4 - One-time things the automation does NOT do (do these before your first prod deploy)

These change the server's own configuration, so they stay in your hands:

1. **Nginx** - the template changed (55 MB uploads + `/uploads` forwarded to the API,
   needed for photos and the Pinterest feed). Re-apply it, then reload:
   ```bash
   sudo cp /var/www/civilbridge-prod/deploy/nginx-prod.conf.example /etc/nginx/conf.d/civilbridge-prod.conf
   sudo cp /var/www/civilbridge-dev/deploy/nginx-dev.conf.example  /etc/nginx/conf.d/civilbridge-dev.conf
   sudo nginx -t && sudo systemctl reload nginx
   ```
   (If certbot already added HTTPS blocks to those files, merge by hand instead of
   overwriting: add the `location ^~ /uploads/ { ... }` block and change
   `client_max_body_size` to `55M`.)
2. **`server/.env` on prod** - make sure these exist (see `server/.env.example`):
   `CLIENT_URL=https://civil-bridge.com`, `SERVER_URL=https://civil-bridge.com`,
   working `SMTP_*` and `FROM_EMAIL`, `OPS_EMAIL`/`FINANCE_EMAIL`. Leave
   `AGENT_ENABLED=false` until your n8n workflow is ready. Restart after editing:
   `pm2 restart civilbridge-prod-api`.
3. **Remove the sample data from the live database** (once), then replace the old
   admin password:
   ```bash
   cd /var/www/civilbridge-prod/server
   npm run clean-samples
   npm run create-admin
   ```
4. **Pinterest** - after prod deploys, open civil-bridge.com → *View page source* →
   search `p:domain_verify`. When you see it, click **Claim your website** in
   Pinterest.

## If a deploy goes wrong

- The run turns red and the log shows why (build error, migration error, or "API
  did not answer"). A failed *check* never reaches the server.
- To undo a bad release: revert the commit (`git revert <commit>` → push) - dev
  redeploys by itself; for prod, run the workflow again with target `prod`.
- Database changes made by `npm run migrate` only ever **add** tables/columns, so
  rolling the code back is safe.
