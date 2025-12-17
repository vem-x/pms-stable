// PM2 Ecosystem Configuration - PMS Backend
// Runs migrations before starting the backend server via start-with-migrations.ps1

module.exports = {
  apps: [
    {
      name: "pms-backend",
      script: "powershell.exe",
      args: "-ExecutionPolicy Bypass -File start-with-migrations.ps1",
      // cwd defaults to the directory where this ecosystem.config.js file is located
      interpreter: "none",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      restart_delay: 5000,
      kill_timeout: 5000,
      env: {
        PYTHONUNBUFFERED: "1",
        // Database and JWT secrets are loaded from .env file in the backend directory
      },
      error_file: "./logs/backend-error.log",
      out_file: "./logs/backend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z"
    }
  ]
};
