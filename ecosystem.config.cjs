// PM2 Ecosystem File for ChatDB
// Usage: pm2-ci start ecosystem.config.cjs
const APP_DIR = '/srv/dev/apps/chatdb-vt';
const VEDANT_HOME = '/home/vedant';

module.exports = {
  apps: [
    {
      name: 'chatdb-backend',
      cwd: `${APP_DIR}/backend`,
      script: `${VEDANT_HOME}/.local/bin/uv`,
      args: 'run uvicorn app.main:app --host 0.0.0.0 --port 6008',
      interpreter: 'none',
      env: {
        PATH: `${VEDANT_HOME}/.local/bin:${VEDANT_HOME}/.nvm/versions/node/v20.20.2/bin:/usr/local/bin:/usr/bin:/bin`,
      },
      max_memory_restart: '512M',
      error_file: `${APP_DIR}/logs/backend-error.log`,
      out_file: `${APP_DIR}/logs/backend-out.log`,
      merge_logs: true,
      time: true,
    },
    {
      name: 'chatdb-frontend',
      cwd: `${APP_DIR}/frontend`,
      script: `${VEDANT_HOME}/.nvm/versions/node/v20.20.2/bin/npx`,
      args: 'serve -s dist -l 6009',
      interpreter: 'none',
      env: {
        PATH: `${VEDANT_HOME}/.nvm/versions/node/v20.20.2/bin:/usr/local/bin:/usr/bin:/bin`,
      },
      max_memory_restart: '256M',
      error_file: `${APP_DIR}/logs/frontend-error.log`,
      out_file: `${APP_DIR}/logs/frontend-out.log`,
      merge_logs: true,
      time: true,
    },
  ],
};
