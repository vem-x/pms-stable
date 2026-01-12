// // PM2 Ecosystem Configuration - PMS Backend
// // Runs migrations before starting the backend server via start-with-migrations.ps1

// module.exports = {
//   apps: [
//     {
//       name: "pms-backend",
//       script: "powershell.exe",
//       args: "-ExecutionPolicy Bypass -File start-with-migrations.ps1",
//       // cwd defaults to the directory where this ecosystem.config.js file is located
//       interpreter: "none",
//       autorestart: true,
//       watch: false,
//       max_memory_restart: "500M",
//       restart_delay: 5000,
//       kill_timeout: 30000, // Increased to 30 seconds to allow migrations to complete
//       min_uptime: 10000, // Must stay up 10 seconds to be considered started
//       max_restarts: 5, // Max 5 restarts in 1 minute
//       env: {
//         PYTHONUNBUFFERED: "1",
//         // Database and JWT secrets are loaded from .env file in the backend directory
//       },
//       error_file: "./logs/backend-error.log",
//       out_file: "./logs/backend-out.log",
//       log_date_format: "YYYY-MM-DD HH:mm:ss Z"
//     }
//   ]
// };

module.exports = {
  apps: [
    {
      name: "pms-backend",
      script: "main.py",           // Your FastAPI entrypoint
      interpreter: "python",       // Use python (or full path to venv)
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        PYTHONUNBUFFERED: "1",
        // Load other env vars here or use pm2 --env-file
      },
      error_file: "./logs/backend-error.log",
      out_file: "./logs/backend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z"
    }
  ]
};
