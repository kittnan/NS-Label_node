# Oracle Database Helper

A robust Oracle database helper with automatic retry logic, connection pooling, timeout handling, and graceful reconnection for Node.js applications.

## Features

- ✅ **Connection Pooling**: Efficient connection management with configurable pool settings
- ✅ **Automatic Retry**: Exponential backoff with jitter for failed queries
- ✅ **Timeout Handling**: Configurable timeouts for connections and queries
- ✅ **Auto-Reconnection**: Automatically reconnects on connection failures
- ✅ **Transaction Support**: Execute multiple queries in a single transaction
- ✅ **Error Detection**: Smart detection of retryable vs. non-retryable errors
- ✅ **Graceful Shutdown**: Proper cleanup on application termination
- ✅ **Pool Statistics**: Monitor connection pool health
- ✅ **Connection Testing**: Verify database connectivity

## Installation

The helper uses `oracledb` package which is already installed in your project.

```bash
npm install oracledb
```

## Configuration

The helper reads configuration from `sqlconfig.js`:

```javascript
// sqlconfig.js
const config = {
  user: 'RCC',
  password: 'RCC00',
  connectString: '10.9.184.3:1521/ora11gu8'
};
```

### Default Settings

**Connection Pool:**
- `poolMin`: 2 - Minimum connections in pool
- `poolMax`: 10 - Maximum connections in pool
- `poolIncrement`: 2 - Connection increment step
- `poolTimeout`: 60 seconds - Idle connection timeout
- `queueTimeout`: 60000 ms - Queue request timeout

**Retry Logic:**
- `maxRetries`: 3 - Maximum retry attempts
- `initialDelay`: 1000 ms - Initial retry delay
- `maxDelay`: 10000 ms - Maximum retry delay
- `backoffMultiplier`: 2 - Exponential backoff multiplier
- `timeoutMs`: 30000 ms - Query execution timeout

## Usage

### Basic Query Execution

```javascript
const oracleHelper = require('./src/helpers/oracleHelper');

// Simple SELECT query
const result = await oracleHelper.executeQuery(
  'SELECT * FROM employees WHERE department_id = :deptId',
  { deptId: 10 }
);

console.log(result.rows);
```

### INSERT/UPDATE/DELETE

```javascript
// INSERT
const insertResult = await oracleHelper.executeQuery(
  `INSERT INTO employees (employee_id, first_name, last_name)
   VALUES (:id, :firstName, :lastName)`,
  { id: 1001, firstName: 'John', lastName: 'Doe' }
);

console.log('Rows inserted:', insertResult.rowsAffected);

// UPDATE
const updateResult = await oracleHelper.executeQuery(
  'UPDATE employees SET salary = :salary WHERE employee_id = :id',
  { salary: 50000, id: 1001 }
);

console.log('Rows updated:', updateResult.rowsAffected);
```

### Custom Options

```javascript
const result = await oracleHelper.executeQuery(
  'SELECT * FROM large_table',
  [],
  {
    maxRetries: 5,          // Override default retry count
    timeoutMs: 60000,       // 60 second timeout
    autoCommit: true        // Auto-commit (default: true)
  }
);
```

### Transaction Support

```javascript
const queries = [
  {
    sql: 'UPDATE accounts SET balance = balance - :amount WHERE account_id = :id',
    binds: { amount: 1000, id: 'ACC001' }
  },
  {
    sql: 'UPDATE accounts SET balance = balance + :amount WHERE account_id = :id',
    binds: { amount: 1000, id: 'ACC002' }
  }
];

try {
  const results = await oracleHelper.executeTransaction(queries);
  console.log('Transaction completed successfully');
} catch (error) {
  console.error('Transaction failed and rolled back');
}
```

### Express.js Integration

```javascript
const express = require('express');
const router = express.Router();
const oracleHelper = require('./src/helpers/oracleHelper');

router.get('/employees', async (req, res) => {
  try {
    const result = await oracleHelper.executeQuery(
      'SELECT * FROM employees WHERE department_id = :deptId',
      { deptId: req.query.departmentId }
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
```

### Application Startup

Initialize the pool when your application starts:

```javascript
// index.js or app.js
const oracleHelper = require('./src/helpers/oracleHelper');

async function startup() {
  try {
    // Initialize connection pool
    await oracleHelper.initializePool();
    console.log('Oracle connection pool initialized');
    
    // Test connection
    const isConnected = await oracleHelper.testConnection();
    if (!isConnected) {
      throw new Error('Database connection test failed');
    }
    
    // Start your application
    app.listen(3000, () => {
      console.log('Server running on port 3000');
    });
  } catch (error) {
    console.error('Startup failed:', error);
    process.exit(1);
  }
}

startup();
```

### Monitor Pool Health

```javascript
const stats = oracleHelper.getPoolStats();
console.log('Pool Statistics:', stats);
/*
{
  connectionsOpen: 3,
  connectionsInUse: 1,
  poolMin: 2,
  poolMax: 10,
  poolIncrement: 2,
  poolTimeout: 60,
  queueTimeout: 60000
}
*/
```

## API Reference

### `executeQuery(sql, binds, options)`

Execute a single query with automatic retry and timeout handling.

**Parameters:**
- `sql` (string) - SQL query to execute
- `binds` (Array|Object) - Bind parameters (default: [])
- `options` (Object) - Optional configuration
  - `maxRetries` (number) - Maximum retry attempts
  - `timeoutMs` (number) - Query timeout in milliseconds
  - `autoCommit` (boolean) - Auto-commit changes

**Returns:** Promise<Object> - Query result with `rows` and `rowsAffected`

### `executeTransaction(queries, options)`

Execute multiple queries in a single transaction.

**Parameters:**
- `queries` (Array) - Array of query objects `[{sql, binds}]`
- `options` (Object) - Optional configuration
  - `maxRetries` (number) - Maximum retry attempts
  - `timeoutMs` (number) - Query timeout in milliseconds

**Returns:** Promise<Array> - Array of query results

### `initializePool()`

Initialize the connection pool. Called automatically by executeQuery if not already initialized.

**Returns:** Promise<Pool>

### `closePool()`

Close the connection pool gracefully.

**Returns:** Promise<void>

### `testConnection()`

Test database connectivity.

**Returns:** Promise<boolean> - true if connection is successful

### `getPoolStats()`

Get current connection pool statistics.

**Returns:** Object - Pool statistics or null if pool is not initialized

## Error Handling

The helper automatically retries on these error types:

- **Connection Errors**: Timeout, refused, reset, not found
- **Oracle Errors**: 
  - ORA-03113: End-of-file on communication channel
  - ORA-03114: Not connected to ORACLE
  - ORA-03135: Connection lost contact
  - ORA-12537: Connection closed
  - ORA-12541: No listener
  - ORA-12170: Connect timeout
  - ORA-12528: All instances blocking new connections
  - And more...

Non-retryable errors (syntax errors, constraint violations, etc.) fail immediately.

## Retry Logic

The helper uses exponential backoff with jitter:

1. Initial delay: 1 second
2. Each retry multiplies delay by 2
3. Maximum delay capped at 10 seconds
4. Random jitter added to prevent thundering herd
5. Automatic pool reinitialization on pool-related errors

**Example retry timeline:**
- Attempt 1: Fails → Wait ~1 second
- Attempt 2: Fails → Wait ~2 seconds
- Attempt 3: Fails → Wait ~4 seconds
- Attempt 4: Fails → Error thrown

## Best Practices

1. **Initialize Early**: Call `initializePool()` during application startup
2. **Handle Errors**: Always wrap queries in try-catch blocks
3. **Use Transactions**: For multiple related operations
4. **Monitor Pool**: Check pool statistics regularly
5. **Set Timeouts**: Adjust timeouts based on query complexity
6. **Test Connections**: Use `testConnection()` for health checks
7. **Graceful Shutdown**: The helper handles SIGINT/SIGTERM automatically

## Troubleshooting

### Connection Timeout
```javascript
// Increase timeout for slow connections
await oracleHelper.executeQuery(sql, binds, {
  timeoutMs: 60000  // 60 seconds
});
```

### Pool Exhaustion
```javascript
// Check pool statistics
const stats = oracleHelper.getPoolStats();
console.log('Connections in use:', stats.connectionsInUse);
console.log('Max connections:', stats.poolMax);

// Increase pool size in poolConfig
```

### Retry Issues
```javascript
// Increase retry attempts for unreliable networks
await oracleHelper.executeQuery(sql, binds, {
  maxRetries: 10
});
```

## License

ISC

## Support

For issues or questions, please check:
1. Oracle connection configuration in `sqlconfig.js`
2. Network connectivity to database server
3. Pool statistics for connection issues
4. Application logs for detailed error messages
