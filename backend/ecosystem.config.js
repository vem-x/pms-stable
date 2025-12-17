// PM2 Ecosystem Configuration - PMS Backend
// Automatically runs migrations before starting the backend server
module.exports = {
  apps: [
    {
      name: "pms-backend",
      script: "python",
      args: "-m uvicorn main:app --host 0.0.0.0 --port 8000",
      interpreter: "none",
      cwd: "C:/Users/vem/pms-stable/backend",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env_file: ".env",
      env: {
        PYTHONUNBUFFERED: "1"
      }
    }
  ]
};