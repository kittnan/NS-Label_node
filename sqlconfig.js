// oracleHelper requires this file before index.js calls dotenv.config(), so load .env here too
require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const config = {
  user: process.env.ORACLE_USER,
  password: process.env.ORACLE_PASSWORD,
  connectString: process.env.ORACLE_CONNECT_STRING
};


module.exports = config;