// PM2 Ecosystem Configuration - PMS Backend
// Automatically runs migrations before starting the backend server
module.exports = {
  apps: [{
    name: 'pms-backend',
    script: 'powershell.exe',
    args: '-ExecutionPolicy Bypass -File start-with-migrations.ps1',
    // cwd defaults to the directory where this file is located
    env: {
      ENVIRONMENT: 'production',
      // DATABASE_URL should be set in .env file or environment variables
      // JWT_SECRET_KEY should be set in .env file or environment variables
      // CORS_ALLOWED_ORIGINS should be set in .env file or environment variables
    },
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    restart_delay: 5000,
    kill_timeout: 5000
  }]
};