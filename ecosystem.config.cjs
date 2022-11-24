module.exports = {
  apps: [
    {
      name: "MagykStock",
      script: "./server.js",
      instances: "1",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
