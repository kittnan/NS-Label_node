/**
 * Oracle Helper - Usage Examples
 * 
 * This file demonstrates how to use the Oracle helper for database operations
 * with automatic retry, timeout handling, and connection management.
 */

const oracleHelper = require('./oracleHelper');

// ============================================================================
// Example 1: Simple SELECT Query
// ============================================================================
async function example1_SimpleSelect() {
  try {
    const result = await oracleHelper.executeQuery(
      'SELECT * FROM employees WHERE department_id = :deptId',
      { deptId: 10 }
    );
    
    console.log('Rows returned:', result.rows.length);
    console.log('Data:', result.rows);
  } catch (error) {
    console.error('Query failed:', error);
  }
}

// ============================================================================
// Example 2: INSERT with Auto-commit
// ============================================================================
async function example2_Insert() {
  try {
    const result = await oracleHelper.executeQuery(
      `INSERT INTO employees (employee_id, first_name, last_name, email, hire_date, job_id)
       VALUES (:id, :firstName, :lastName, :email, SYSDATE, :jobId)`,
      {
        id: 1001,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        jobId: 'IT_PROG'
      }
    );
    
    console.log('Rows affected:', result.rowsAffected);
  } catch (error) {
    console.error('Insert failed:', error);
  }
}

// ============================================================================
// Example 3: UPDATE with Custom Options
// ============================================================================
async function example3_UpdateWithOptions() {
  try {
    const result = await oracleHelper.executeQuery(
      'UPDATE employees SET salary = salary * 1.1 WHERE department_id = :deptId',
      { deptId: 10 },
      {
        maxRetries: 5,        // Custom retry count
        timeoutMs: 60000,     // 60 second timeout
        autoCommit: true
      }
    );
    
    console.log('Rows updated:', result.rowsAffected);
  } catch (error) {
    console.error('Update failed:', error);
  }
}

// ============================================================================
// Example 4: Multiple Queries in Transaction
// ============================================================================
async function example4_Transaction() {
  try {
    const queries = [
      {
        sql: 'UPDATE accounts SET balance = balance - :amount WHERE account_id = :fromAccount',
        binds: { amount: 1000, fromAccount: 'ACC001' }
      },
      {
        sql: 'UPDATE accounts SET balance = balance + :amount WHERE account_id = :toAccount',
        binds: { amount: 1000, toAccount: 'ACC002' }
      },
      {
        sql: `INSERT INTO transactions (from_account, to_account, amount, transaction_date)
              VALUES (:fromAccount, :toAccount, :amount, SYSDATE)`,
        binds: { fromAccount: 'ACC001', toAccount: 'ACC002', amount: 1000 }
      }
    ];

    const results = await oracleHelper.executeTransaction(queries);
    console.log('Transaction completed successfully');
    console.log('Results:', results.map(r => r.rowsAffected));
  } catch (error) {
    console.error('Transaction failed and rolled back:', error);
  }
}

// ============================================================================
// Example 5: Using with Express Route
// ============================================================================
function example5_ExpressRoute() {
  const express = require('express');
  const router = express.Router();

  router.get('/employees', async (req, res) => {
    try {
      const { departmentId, jobId } = req.query;
      
      let sql = 'SELECT * FROM employees WHERE 1=1';
      const binds = {};
      
      if (departmentId) {
        sql += ' AND department_id = :departmentId';
        binds.departmentId = departmentId;
      }
      
      if (jobId) {
        sql += ' AND job_id = :jobId';
        binds.jobId = jobId;
      }
      
      const result = await oracleHelper.executeQuery(sql, binds);
      res.json({
        success: true,
        count: result.rows.length,
        data: result.rows
      });
    } catch (error) {
      console.error('Error fetching employees:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  router.post('/employees', async (req, res) => {
    try {
      const { firstName, lastName, email, jobId, departmentId } = req.body;
      
      const result = await oracleHelper.executeQuery(
        `INSERT INTO employees (employee_id, first_name, last_name, email, hire_date, job_id, department_id)
         VALUES (employees_seq.NEXTVAL, :firstName, :lastName, :email, SYSDATE, :jobId, :departmentId)
         RETURNING employee_id INTO :id`,
        {
          firstName,
          lastName,
          email,
          jobId,
          departmentId,
          id: { dir: oracleHelper.BIND_OUT, type: oracleHelper.NUMBER }
        }
      );
      
      res.json({
        success: true,
        message: 'Employee created successfully',
        employeeId: result.outBinds.id
      });
    } catch (error) {
      console.error('Error creating employee:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
}

// ============================================================================
// Example 6: Test Connection
// ============================================================================
async function example6_TestConnection() {
  const isConnected = await oracleHelper.testConnection();
  console.log('Database connection:', isConnected ? 'OK' : 'FAILED');
}

// ============================================================================
// Example 7: Get Pool Statistics
// ============================================================================
async function example7_PoolStats() {
  // Initialize pool first
  await oracleHelper.initializePool();
  
  const stats = oracleHelper.getPoolStats();
  console.log('Pool Statistics:', stats);
  /*
  Output example:
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
}

// ============================================================================
// Example 8: Handling Pagination
// ============================================================================
async function example8_Pagination() {
  try {
    const page = 1;
    const pageSize = 20;
    const offset = (page - 1) * pageSize;
    
    const result = await oracleHelper.executeQuery(
      `SELECT * FROM (
         SELECT e.*, ROW_NUMBER() OVER (ORDER BY employee_id) as rn
         FROM employees e
         WHERE department_id = :deptId
       )
       WHERE rn > :offset AND rn <= :limit`,
      {
        deptId: 10,
        offset: offset,
        limit: offset + pageSize
      }
    );
    
    console.log('Page:', page);
    console.log('Results:', result.rows);
  } catch (error) {
    console.error('Pagination query failed:', error);
  }
}

// ============================================================================
// Example 9: Bulk Insert
// ============================================================================
async function example9_BulkInsert() {
  try {
    const employees = [
      { id: 1001, name: 'John Doe', email: 'john@example.com' },
      { id: 1002, name: 'Jane Smith', email: 'jane@example.com' },
      { id: 1003, name: 'Bob Johnson', email: 'bob@example.com' }
    ];

    const queries = employees.map(emp => ({
      sql: 'INSERT INTO employees (employee_id, name, email) VALUES (:id, :name, :email)',
      binds: { id: emp.id, name: emp.name, email: emp.email }
    }));

    const results = await oracleHelper.executeTransaction(queries);
    console.log('Bulk insert completed:', results.length, 'rows inserted');
  } catch (error) {
    console.error('Bulk insert failed:', error);
  }
}

// ============================================================================
// Example 10: Initialize Pool on Application Startup
// ============================================================================
async function example10_AppStartup() {
  try {
    // Initialize the connection pool when your application starts
    await oracleHelper.initializePool();
    console.log('Oracle connection pool initialized');
    
    // Test the connection
    const isConnected = await oracleHelper.testConnection();
    if (isConnected) {
      console.log('Database connection verified');
    } else {
      console.error('Database connection test failed');
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

// ============================================================================
// Export functions for testing
// ============================================================================
module.exports = {
  example1_SimpleSelect,
  example2_Insert,
  example3_UpdateWithOptions,
  example4_Transaction,
  example5_ExpressRoute,
  example6_TestConnection,
  example7_PoolStats,
  example8_Pagination,
  example9_BulkInsert,
  example10_AppStartup
};
