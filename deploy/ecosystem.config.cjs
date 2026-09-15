// PM2 process config for the CivilBridge backend.
//
// .cjs (not .js) is deliberate: server/package.json has "type": "module",
// so a plain .js file here would be parsed as ESM and PM2's config loader
// (which expects CommonJS `module.exports`) would fail to read it.
//
// RUNNING DEV + PROD SIDE BY SIDE ON ONE SERVER: dev and prod are two
// separate git checkouts (e.g. /var/www/civilbridge-dev and
// /var/www/civilbridge-prod), each with this same file. The only thing
// that needs to differ between the two copies is the `name` below -
// rename it to "civilbridge-dev-api" in the dev checkout - so
// `pm2 restart civilbridge-prod-api` and `pm2 restart civilbridge-dev-api`
// each target the right one. The actual port each one listens on comes
// from that checkout's own server/.env (PORT=5000 for prod, PORT=5001
// for dev) - nothing to change here for that part.
//
// Usage (run from the repo root on the server):
//   pm2 start deploy/ecosystem.config.cjs
//   pm2 save                # persist the process list across reboots
//   pm2 startup             # print (and optionally run) the command that
//                           # makes PM2 itself start on server boot
//
// After every deploy: `pm2 restart <name>` (see deploy.sh).

module.exports = {
  apps: [
    {
      name: "civilbridge-prod-api", // rename to civilbridge-dev-api in the dev checkout
      cwd: "./server",
      script: "src/index.js",
      // The app reads config from server/.env itself (via dotenv) - this
      // just ensures PM2 always runs it as production regardless of how
      // NODE_ENV happens to be set in the shell that launches PM2.
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      out_file: "../logs/pm2-out.log",
      error_file: "../logs/pm2-error.log",
      time: true,
    },
  ],
};
