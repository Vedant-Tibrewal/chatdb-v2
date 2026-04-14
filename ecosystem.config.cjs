// PM2 Ecosystem File for ChatDB
// Usage: pm2-ci start ecosystem.config.cjs
const APP_DIR = '/srv/dev/apps/chatdb-vt';

module.exports = {
  apps: [
    {
      name: 'chatdb-backend',
      cwd: `${APP_DIR}/backend`,
      script: '/usr/local/bin/uv',
      args: 'run uvicorn app.main:app --host 0.0.0.0 --port 6008',
      interpreter: 'none',
      env: {
        PATH: '/usr/local/bin:/usr/bin:/bin',
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
      script: '/usr/local/bin/npx',
      args: 'serve -s dist -l 6009',
      interpreter: 'none',
      env: {
        PATH: '/usr/local/bin:/usr/bin:/bin',
      },
      max_memory_restart: '256M',
      error_file: `${APP_DIR}/logs/frontend-error.log`,
      out_file: `${APP_DIR}/logs/frontend-out.log`,
      merge_logs: true,
      time: true,
    },
  ],
};
