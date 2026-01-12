module.exports = {
  apps: [{
    name: 'pms-frontend',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3000 -H 0.0.0.0',
    interpreter: 'node',
    // cwd defaults to the directory where this ecosystem.config.js file is located
    env: {
      NODE_ENV: 'production',
      NEXT_PUBLIC_API_URL: 'http://160.226.0.67:8000',
      NEXT_PUBLIC_WS_URL: 'ws://160.226.0.67:8000/ws'
    },
    autorestart: true,
    watch: false,
    max_memory_restart: '500M'
  }]
};