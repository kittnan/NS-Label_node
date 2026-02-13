const oracledb = require('oracledb');
const dbConfig = require('../../sqlconfig');

// Configure Oracle client settings
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = true;

// Connection pool configuration
const poolConfig = {
  user: dbConfig.user,
  password: dbConfig.password,
  connectString: dbConfig.connectString,
  poolMin: 2,
  poolMax: 10,
  poolIncrement: 2,
  poolTimeout: 60, // seconds
  queueTimeout: 60000, // milliseconds
  enableStatistics: true
};

// Retry configuration
const retryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // milliseconds
  maxDelay: 10000, // milliseconds
  backoffMultiplier: 2,
  timeoutMs: 30000 // query timeout
};

let pool = null;
let isPoolClosing = false;

/**
 * Initialize the Oracle connection pool
 * @returns {Promise<oracledb.Pool>}
 */
async function initializePool() {
  try {
    if (pool && !isPoolClosing) {
      return pool;
    }

    console.log('Initializing Oracle connection pool...');
    pool = await oracledb.createPool(poolConfig);
    isPoolClosing = false;
    console.log('Oracle connection pool created successfully');
    
    return pool;
  } catch (error) {
    console.error('Error creating Oracle connection pool:', error);
    throw error;
  }
}

/**
 * Close the connection pool
 * @returns {Promise<void>}
 */
async function closePool() {
  if (pool) {
    try {
      isPoolClosing = true;
      console.log('Closing Oracle connection pool...');
      await pool.close(10); // drain time in seconds
      pool = null;
      console.log('Oracle connection pool closed');
    } catch (error) {
      console.error('Error closing Oracle connection pool:', error);
      throw error;
    } finally {
      isPoolClosing = false;
    }
  }
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay for exponential backoff
 * @param {number} attempt - current attempt number (0-based)
 * @returns {number} delay in milliseconds
 */
function calculateBackoff(attempt) {
  const delay = Math.min(
    retryConfig.initialDelay * Math.pow(retryConfig.backoffMultiplier, attempt),
    retryConfig.maxDelay
  );
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
}

/**
 * Check if error is retryable
 * @param {Error} error
 * @returns {boolean}
 */
function isRetryableError(error) {
  if (!error) return false;

  const retryableErrors = [
    'NJS-040', // connection request timeout
    'NJS-501', // connection pool is closing
    'NJS-503', // connection pool is not open
    'ORA-03113', // end-of-file on communication channel
    'ORA-03114', // not connected to ORACLE
    'ORA-03135', // connection lost contact
    'ORA-12537', // connection closed
    'ORA-12541', // no listener
    'ORA-12170', // connect timeout
    'ORA-12528', // listener: all appropriate instances are blocking new connections
    'ORA-12514', // listener does not currently know of service
    'ORA-01089', // immediate shutdown in progress
    'ORA-00028', // your session has been killed
    'ETIMEDOUT',
    'ECONNREFUSED',
    'ECONNRESET',
    'ENOTFOUND'
  ];

  const errorMessage = error.message || '';
  const errorCode = error.code || '';

  return retryableErrors.some(code => 
    errorMessage.includes(code) || errorCode.includes(code)
  );
}

/**
 * Execute query with retry logic and timeout handling
 * @param {string} sql - SQL query to execute
 * @param {Array|Object} binds - Bind parameters
 * @param {Object} options - Additional options
 * @param {number} options.maxRetries - Override max retries
 * @param {number} options.timeoutMs - Override query timeout
 * @param {boolean} options.autoCommit - Override auto commit
 * @returns {Promise<Object>} Query result
 */
async function executeQuery(sql, binds = [], options = {}) {
  const maxRetries = options.maxRetries ?? retryConfig.maxRetries;
  const timeoutMs = options.timeoutMs ?? retryConfig.timeoutMs;
  const executeOptions = {
    autoCommit: options.autoCommit ?? true,
    outFormat: oracledb.OUT_FORMAT_OBJECT
  };

  let lastError = null;
  let connection = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Ensure pool is initialized
      if (!pool || isPoolClosing) {
        await initializePool();
      }

      // Get connection from pool
      connection = await Promise.race([
        pool.getConnection(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), timeoutMs)
        )
      ]);

      // Execute query with timeout
      const result = await Promise.race([
        connection.execute(sql, binds, executeOptions),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query execution timeout')), timeoutMs)
        )
      ]);

      // Release connection back to pool
      await connection.close();
      
      return result;

    } catch (error) {
      lastError = error;
      
      // Close connection if it exists
      if (connection) {
        try {
          await connection.close();
        } catch (closeError) {
          console.error('Error closing connection:', closeError);
        }
        connection = null;
      }

      // Check if error is retryable
      if (!isRetryableError(error) || attempt >= maxRetries) {
        console.error(`Query execution failed after ${attempt + 1} attempts:`, error);
        throw error;
      }

      // Calculate backoff delay
      const delay = calculateBackoff(attempt);
      console.warn(
        `Query failed (attempt ${attempt + 1}/${maxRetries + 1}): ${error.message}. ` +
        `Retrying in ${delay}ms...`
      );

      // If pool seems broken, try to reinitialize
      if (error.message.includes('pool') || error.message.includes('NJS-')) {
        try {
          await closePool();
          await sleep(delay);
          await initializePool();
        } catch (poolError) {
          console.error('Error reinitializing pool:', poolError);
          await sleep(delay);
        }
      } else {
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error('Query execution failed');
}

/**
 * Execute multiple queries in a transaction
 * @param {Array<{sql: string, binds: Array|Object}>} queries - Array of query objects
 * @param {Object} options - Additional options
 * @returns {Promise<Array>} Array of query results
 */
async function executeTransaction(queries, options = {}) {
  const maxRetries = options.maxRetries ?? retryConfig.maxRetries;
  const timeoutMs = options.timeoutMs ?? retryConfig.timeoutMs;

  let lastError = null;
  let connection = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Ensure pool is initialized
      if (!pool || isPoolClosing) {
        await initializePool();
      }

      // Get connection from pool
      connection = await Promise.race([
        pool.getConnection(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), timeoutMs)
        )
      ]);

      const results = [];

      // Execute all queries in transaction
      for (const query of queries) {
        const result = await Promise.race([
          connection.execute(query.sql, query.binds || [], {
            autoCommit: false,
            outFormat: oracledb.OUT_FORMAT_OBJECT
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Query execution timeout')), timeoutMs)
          )
        ]);
        results.push(result);
      }

      // Commit transaction
      await connection.commit();

      // Release connection
      await connection.close();

      return results;

    } catch (error) {
      lastError = error;

      // Rollback transaction if connection exists
      if (connection) {
        try {
          await connection.rollback();
          await connection.close();
        } catch (rollbackError) {
          console.error('Error during rollback:', rollbackError);
        }
        connection = null;
      }

      // Check if error is retryable
      if (!isRetryableError(error) || attempt >= maxRetries) {
        console.error(`Transaction failed after ${attempt + 1} attempts:`, error);
        throw error;
      }

      // Calculate backoff delay
      const delay = calculateBackoff(attempt);
      console.warn(
        `Transaction failed (attempt ${attempt + 1}/${maxRetries + 1}): ${error.message}. ` +
        `Retrying in ${delay}ms...`
      );

      // If pool seems broken, try to reinitialize
      if (error.message.includes('pool') || error.message.includes('NJS-')) {
        try {
          await closePool();
          await sleep(delay);
          await initializePool();
        } catch (poolError) {
          console.error('Error reinitializing pool:', poolError);
          await sleep(delay);
        }
      } else {
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error('Transaction execution failed');
}

/**
 * Get pool statistics
 * @returns {Object} Pool statistics
 */
function getPoolStats() {
  if (pool) {
    return {
      connectionsOpen: pool.connectionsOpen,
      connectionsInUse: pool.connectionsInUse,
      poolMin: pool.poolMin,
      poolMax: pool.poolMax,
      poolIncrement: pool.poolIncrement,
      poolTimeout: pool.poolTimeout,
      queueTimeout: pool.queueTimeout
    };
  }
  return null;
}

/**
 * Test database connection
 * @returns {Promise<boolean>}
 */
async function testConnection() {
  try {
    const result = await executeQuery('SELECT 1 as test FROM DUAL', [], {
      maxRetries: 1,
      timeoutMs: 5000
    });
    return result.rows && result.rows.length > 0;
  } catch (error) {
    console.error('Connection test failed:', error);
    return false;
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing Oracle connection pool...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing Oracle connection pool...');
  await closePool();
  process.exit(0);
});

module.exports = {
  initializePool,
  closePool,
  executeQuery,
  executeTransaction,
  getPoolStats,
  testConnection,
  retryConfig,
  poolConfig
};
