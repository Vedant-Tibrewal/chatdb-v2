// PM2 Ecosystem File for ChatDB
// Usage: pm2-ci start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'chatdb-backend',
      cwd: './backend',
      script: 'uv',
      args: 'run uvicorn app.main:app --host 0.0.0.0 --port 6008',
      interpreter: 'none',
      env: {
        UV_PROJECT_ENVIRONMENT: './backend/.venv',
      },
      max_memory_restart: '512M',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'chatdb-frontend',
      cwd: './frontend',
      script: 'npx',
      args: 'serve -s dist -l 6009',
      interpreter: 'none',
      max_memory_restart: '256M',
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
