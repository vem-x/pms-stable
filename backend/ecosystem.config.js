// PM2 Ecosystem Configuration - PMS Backend
// Automatically runs migrations before starting the backend server
module.exports = {
  apps: [
    {
      name: "pms-backend",
      script: "uvicorn",
      args: "main:app --host 0.0.0.0 --port 8000 ",
      interpreter: "none",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        ENVIRONMENT: "production",
        PYTHONUNBUFFERED: "1"
      }
    }
  ]
};