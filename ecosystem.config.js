module.exports = {
  apps: [
    {
      name: 'quiplash-nextjs',
      script: '.next/standalone/server.js',
      cwd: '/var/www/family-quiplash',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
    },
    {
      name: 'quiplash-partykit',
      script: 'npx',
      args: 'partykit dev --port 1999',
      cwd: '/var/www/family-quiplash',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
