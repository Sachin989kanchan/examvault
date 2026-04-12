const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'examvault',
  waitForConnections: true,
  connectionLimit: 50,

  queueLimit: 50,

  connectTimeout: 10000,
  idleTimeout: 60000,    // release idle connections after 60s

  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  timezone: '+00:00',
});



module.exports = pool;
