module.exports = {
  apps: [
    {
      name: 'nexus-os',
      script: 'npm',
      args: 'run dev',
      cwd: '/home/z/my-project',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      error_file: '/home/z/my-project/logs/nexus-error.log',
      out_file: '/home/z/my-project/logs/nexus-out.log',
      time: true,
      restart_delay: 5000,
      max_restarts: 50,
      min_uptime: '30s',
      listen_timeout: 30000,
      kill_timeout: 10000
    }
  ]
};
