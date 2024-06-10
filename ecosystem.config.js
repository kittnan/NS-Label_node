module.exports = {
  apps: [
    {
      name: "ns-label-node",
      script: "./index.js", // your script
      watch: true,
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 4064,
        DATABASE: "mongodb://10.200.90.152:27017/ns-label",
      },
    },
  ],
};
