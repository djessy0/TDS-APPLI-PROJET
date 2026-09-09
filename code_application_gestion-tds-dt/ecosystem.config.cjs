module.exports = {
  apps : [{
    name: "tds-dt",
    script: "npm",
    args: "run start:prod",
    env: {
      NODE_ENV: "production",
      PORT: 3000
    },
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
}
