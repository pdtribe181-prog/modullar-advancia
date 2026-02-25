module.exports = {
  apps: [
    {
      name: 'advancia-api',
      script: './dist/server.js',
      cwd: '/var/www/advancia',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster', // Cluster mode for load balancing
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      watch: false, // Don't watch in production
      max_memory_restart: '1G', // Restart if memory exceeds 1GB
      error_file: '/var/log/pm2/advancia-error.log',
      out_file: '/var/log/pm2/advancia-out.log',
      time: true, // Add timestamps to logs
    },
  ],
};
