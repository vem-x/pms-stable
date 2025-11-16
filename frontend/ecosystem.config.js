module.exports = {
  apps: [{
    name: 'pms-frontend',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3000 -H 0.0.0.0',
    interpreter: 'node',
    cwd: 'C:/Users/vem/pms-stable/frontend',
    env: {
      NODE_ENV: 'production',
      NEXT_PUBLIC_API_URL: 'http://localhost:8000/api',
      NEXT_PUBLIC_WS_URL: 'ws://localhost:8000/ws'
    },
    autorestart: true,
    watch: false,
    max_memory_restart: '500M'
  }]
};