# Oracle Helper - Quick Start Guide

## 📦 What Was Created

1. **Main Helper** (`src/helpers/oracleHelper.js`)
   - Connection pool management
   - Automatic retry with exponential backoff
   - Timeout handling
   - Auto-reconnection on failures
   - Transaction support
   
2. **Documentation** (`src/helpers/README.md`)
   - Complete API reference
   - Configuration options
   - Best practices
   
3. **Examples** (`src/helpers/oracleHelper.example.js`)
   - 10 different usage examples
   - Express.js integration
   - Transaction handling
   
4. **Test Suite** (`src/helpers/test-oracle.js`)
   - 10 automated tests
   - Connection verification
   - Query testing

5. **Integration**
   - Updated `index.js` - initializes pool on startup
   - Updated `src/routes/models.js` - example endpoints

## 🚀 Quick Start

### 1. Test the Connection

Run the test script to verify everything works:

```bash
node src/helpers/test-oracle.js
```

This will run 10 tests including:
- Pool initialization
- Connection testing
- Query execution
- Retry logic
- Concurrent queries

### 2. Start Your Application

The helper automatically initializes when you start your app:

```bash
npm start
```

You should see:
```
Initializing Oracle connection pool...
Oracle connection pool created successfully
✓ Oracle database connection verified
Oracle Pool Stats: { connectionsOpen: 2, connectionsInUse: 0, ... }
```

### 3. Test the API Endpoints

The following Oracle endpoints are now available:

**Test Connection:**
```bash
GET http://localhost:YOUR_PORT/model/oracle/test
```

**Query Data:**
```bash
GET http://localhost:YOUR_PORT/model/oracle/query?table=YOUR_TABLE
```

**Insert Data:**
```bash
POST http://localhost:YOUR_PORT/model/oracle/insert
Body: {
  "table": "YOUR_TABLE",
  "data": { "column1": "value1", "column2": "value2" }
}
```

**Execute Transaction:**
```bash
POST http://localhost:YOUR_PORT/model/oracle/transaction
Body: {
  "queries": [
    { "sql": "INSERT INTO ...", "binds": {...} },
    { "sql": "UPDATE ...", "binds": {...} }
  ]
}
```

**Pool Statistics:**
```bash
GET http://localhost:YOUR_PORT/model/oracle/stats
```

## 📝 Basic Usage in Your Code

### Simple Query
```javascript
const oracleHelper = require('./src/helpers/oracleHelper');

const result = await oracleHelper.executeQuery(
  'SELECT * FROM employees WHERE department_id = :deptId',
  { deptId: 10 }
);
console.log(result.rows);
```

### Insert/Update
```javascript
const result = await oracleHelper.executeQuery(
  'INSERT INTO employees (id, name) VALUES (:id, :name)',
  { id: 1001, name: 'John Doe' }
);
console.log('Rows affected:', result.rowsAffected);
```

### Transaction
```javascript
const queries = [
  { sql: 'UPDATE accounts SET balance = balance - 100 WHERE id = :id', binds: { id: 1 } },
  { sql: 'UPDATE accounts SET balance = balance + 100 WHERE id = :id', binds: { id: 2 } }
];

const results = await oracleHelper.executeTransaction(queries);
```

### Custom Options
```javascript
const result = await oracleHelper.executeQuery(
  'SELECT * FROM large_table',
  [],
  {
    maxRetries: 5,       // Retry up to 5 times
    timeoutMs: 60000,    // 60 second timeout
    autoCommit: true     // Auto-commit (default)
  }
);
```

## 🔧 Configuration

Edit configuration in `src/helpers/oracleHelper.js`:

```javascript
// Connection Pool
const poolConfig = {
  poolMin: 2,           // Minimum connections
  poolMax: 10,          // Maximum connections
  poolIncrement: 2,     // Connection increment
  poolTimeout: 60,      // Idle timeout (seconds)
  queueTimeout: 60000   // Queue timeout (ms)
};

// Retry Logic
const retryConfig = {
  maxRetries: 3,              // Max retry attempts
  initialDelay: 1000,         // Initial delay (ms)
  maxDelay: 10000,            // Max delay (ms)
  backoffMultiplier: 2,       // Exponential multiplier
  timeoutMs: 30000            // Query timeout (ms)
};
```

## 🎯 Key Features

### ✅ Automatic Retry
- Retries on connection errors
- Exponential backoff with jitter
- Smart detection of retryable errors

### ✅ Timeout Protection
- Connection timeout
- Query execution timeout
- Configurable per query

### ✅ Connection Management
- Connection pooling
- Auto-reconnection
- Graceful shutdown

### ✅ Error Handling
- Detects 15+ Oracle error types
- Network error handling
- Transaction rollback

### ✅ Monitoring
- Pool statistics
- Connection tracking
- Health checks

## 🐛 Troubleshooting

### Connection Fails
```javascript
// Check connection
const isConnected = await oracleHelper.testConnection();
console.log('Connected:', isConnected);

// Check pool stats
const stats = oracleHelper.getPoolStats();
console.log('Pool:', stats);
```

### Query Timeout
```javascript
// Increase timeout
await oracleHelper.executeQuery(sql, binds, {
  timeoutMs: 60000  // 60 seconds
});
```

### Pool Exhausted
```javascript
// Check pool usage
const stats = oracleHelper.getPoolStats();
console.log('In use:', stats.connectionsInUse);
console.log('Max:', stats.poolMax);

// Increase poolMax in poolConfig if needed
```

## 📚 Next Steps

1. ✅ Test the connection: `node src/helpers/test-oracle.js`
2. ✅ Review examples: `src/helpers/oracleHelper.example.js`
3. ✅ Read full docs: `src/helpers/README.md`
4. ✅ Integrate into your routes
5. ✅ Monitor pool statistics
6. ✅ Adjust configuration as needed

## 💡 Tips

- Always use bind parameters to prevent SQL injection
- Monitor pool statistics for optimal sizing
- Set appropriate timeouts for your queries
- Use transactions for related operations
- Test connection on application startup
- Handle errors gracefully in routes

## 🆘 Support

For issues:
1. Check database configuration in `sqlconfig.js`
2. Verify network connectivity
3. Review application logs
4. Check pool statistics
5. Run test suite for diagnostics

---

**Ready to use!** The helper is now integrated and ready for your Oracle database operations. 🎉
