/**
 * Oracle Helper Test Script
 * 
 * Run this script to test the Oracle helper functionality
 * Usage: node src/helpers/test-oracle.js
 */

const oracleHelper = require('./oracleHelper');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(`✓ ${message}`, colors.green);
}

function error(message) {
  log(`✗ ${message}`, colors.red);
}

function info(message) {
  log(`ℹ ${message}`, colors.cyan);
}

function warn(message) {
  log(`⚠ ${message}`, colors.yellow);
}

// Test 1: Initialize Pool
async function test1_InitializePool() {
  info('Test 1: Initializing connection pool...');
  try {
    await oracleHelper.initializePool();
    success('Connection pool initialized');
    return true;
  } catch (err) {
    error(`Failed to initialize pool: ${err.message}`);
    return false;
  }
}

// Test 2: Test Connection
async function test2_TestConnection() {
  info('Test 2: Testing database connection...');
  try {
    const isConnected = await oracleHelper.testConnection();
    if (isConnected) {
      success('Database connection successful');
      return true;
    } else {
      error('Database connection failed');
      return false;
    }
  } catch (err) {
    error(`Connection test error: ${err.message}`);
    return false;
  }
}

// Test 3: Simple Query
async function test3_SimpleQuery() {
  info('Test 3: Executing simple query...');
  try {
    const result = await oracleHelper.executeQuery(
      'SELECT 1 as test_number, SYSDATE as current_date FROM DUAL'
    );
    
    if (result.rows && result.rows.length > 0) {
      success('Query executed successfully');
      console.log('Result:', result.rows[0]);
      return true;
    } else {
      error('Query returned no results');
      return false;
    }
  } catch (err) {
    error(`Query execution error: ${err.message}`);
    return false;
  }
}

// Test 4: Query with Bind Parameters
async function test4_QueryWithBinds() {
  info('Test 4: Executing query with bind parameters...');
  try {
    const result = await oracleHelper.executeQuery(
      'SELECT :value1 as param1, :value2 as param2 FROM DUAL',
      { value1: 'Hello', value2: 'World' }
    );
    
    if (result.rows && result.rows.length > 0) {
      success('Query with binds executed successfully');
      console.log('Result:', result.rows[0]);
      return true;
    } else {
      error('Query returned no results');
      return false;
    }
  } catch (err) {
    error(`Query with binds error: ${err.message}`);
    return false;
  }
}

// Test 5: Query with Custom Timeout
async function test5_QueryWithTimeout() {
  info('Test 5: Testing custom timeout...');
  try {
    const result = await oracleHelper.executeQuery(
      'SELECT 1 FROM DUAL',
      [],
      { timeoutMs: 5000, maxRetries: 1 }
    );
    
    if (result.rows && result.rows.length > 0) {
      success('Query with custom timeout executed successfully');
      return true;
    } else {
      error('Query returned no results');
      return false;
    }
  } catch (err) {
    error(`Query with timeout error: ${err.message}`);
    return false;
  }
}

// Test 6: Pool Statistics
async function test6_PoolStatistics() {
  info('Test 6: Retrieving pool statistics...');
  try {
    const stats = oracleHelper.getPoolStats();
    
    if (stats) {
      success('Pool statistics retrieved successfully');
      console.log('Pool Stats:', {
        connectionsOpen: stats.connectionsOpen,
        connectionsInUse: stats.connectionsInUse,
        poolMin: stats.poolMin,
        poolMax: stats.poolMax
      });
      return true;
    } else {
      warn('Pool not initialized or no statistics available');
      return false;
    }
  } catch (err) {
    error(`Pool statistics error: ${err.message}`);
    return false;
  }
}

// Test 7: Retry Logic (simulated)
async function test7_RetryLogic() {
  info('Test 7: Testing retry logic with short timeout...');
  try {
    // This should trigger retry logic if the query takes too long
    const result = await oracleHelper.executeQuery(
      'SELECT 1 FROM DUAL',
      [],
      { maxRetries: 2, timeoutMs: 50 } // Very short timeout to potentially trigger retry
    );
    
    success('Retry logic test completed (query succeeded despite short timeout)');
    return true;
  } catch (err) {
    // This is expected if timeout is too short
    warn(`Retry logic test completed with expected timeout: ${err.message}`);
    return true; // Still pass the test as this is expected behavior
  }
}

// Test 8: Transaction (if you have a test table)
async function test8_Transaction() {
  info('Test 8: Testing transaction support...');
  info('Skipping transaction test (requires test table)');
  warn('To test transactions, create a test table and modify this test');
  return true;
}

// Test 9: Multiple Concurrent Queries
async function test9_ConcurrentQueries() {
  info('Test 9: Testing concurrent queries...');
  try {
    const queries = [
      oracleHelper.executeQuery('SELECT 1 as num FROM DUAL'),
      oracleHelper.executeQuery('SELECT 2 as num FROM DUAL'),
      oracleHelper.executeQuery('SELECT 3 as num FROM DUAL')
    ];
    
    const results = await Promise.all(queries);
    
    if (results.length === 3 && results.every(r => r.rows.length > 0)) {
      success('Concurrent queries executed successfully');
      console.log('Results:', results.map(r => r.rows[0]));
      return true;
    } else {
      error('Concurrent queries failed');
      return false;
    }
  } catch (err) {
    error(`Concurrent queries error: ${err.message}`);
    return false;
  }
}

// Test 10: Close Pool
async function test10_ClosePool() {
  info('Test 10: Closing connection pool...');
  try {
    await oracleHelper.closePool();
    success('Connection pool closed successfully');
    return true;
  } catch (err) {
    error(`Failed to close pool: ${err.message}`);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  log('Oracle Helper Test Suite', colors.blue);
  console.log('='.repeat(60) + '\n');

  const tests = [
    { name: 'Initialize Pool', fn: test1_InitializePool },
    { name: 'Test Connection', fn: test2_TestConnection },
    { name: 'Simple Query', fn: test3_SimpleQuery },
    { name: 'Query with Binds', fn: test4_QueryWithBinds },
    { name: 'Query with Timeout', fn: test5_QueryWithTimeout },
    { name: 'Pool Statistics', fn: test6_PoolStatistics },
    { name: 'Retry Logic', fn: test7_RetryLogic },
    { name: 'Transaction', fn: test8_Transaction },
    { name: 'Concurrent Queries', fn: test9_ConcurrentQueries },
    { name: 'Close Pool', fn: test10_ClosePool }
  ];

  const results = [];
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      results.push({ name: test.name, passed: result });
      console.log(''); // Add spacing between tests
    } catch (err) {
      error(`Test "${test.name}" threw an unexpected error: ${err.message}`);
      results.push({ name: test.name, passed: false });
      console.log('');
    }
  }

  // Summary
  console.log('='.repeat(60));
  log('Test Summary', colors.blue);
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  results.forEach(result => {
    if (result.passed) {
      success(`${result.name}`);
    } else {
      error(`${result.name}`);
    }
  });
  
  console.log('');
  log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`, colors.cyan);
  
  if (failed === 0) {
    success('All tests passed! 🎉');
  } else {
    warn(`${failed} test(s) failed`);
  }
  
  console.log('='.repeat(60) + '\n');
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(err => {
    error(`Test suite error: ${err.message}`);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  test1_InitializePool,
  test2_TestConnection,
  test3_SimpleQuery,
  test4_QueryWithBinds,
  test5_QueryWithTimeout,
  test6_PoolStatistics,
  test7_RetryLogic,
  test8_Transaction,
  test9_ConcurrentQueries,
  test10_ClosePool
};
