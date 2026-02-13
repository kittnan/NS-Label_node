let express = require("express");
let router = express.Router();
var mongoose = require("mongodb");
const { ObjectId } = mongoose;
const MODELS = require("../models/models");
const MODELS_BACKUP = require("../models/models_backup");
let axios = require("axios");
const oracleHelper = require('../helpers/oracleHelper');

router.get("/", async (req, res, next) => {
  try {
    let { kydCD } = req.query
    let condition = [{
      $match: {}
    }]
    if (kydCD) {
      kydCD = JSON.parse(kydCD)
      condition.push({
        $match: {
          "KYD Cd": {
            $in: kydCD
          }
        }
      })
    }
    const usersQuery = await MODELS.aggregate(condition)
    res.json(usersQuery);
  } catch (error) {
    console.log("🚀 ~ error:", error);
    res.sendStatus(500);
  }
});
router.post("/create", async (req, res, next) => {
  try {
    const data = await MODELS.insertMany(req.body)
    res.json(data);
  } catch (error) {
    console.log("🚀 ~ error:", error);
    res.sendStatus(500);
  }
});
router.post("/createCompare", async (req, res, next) => {
  try {
    // todo data from model to backup and delete all data in model
    const dataModel = await MODELS.find({})
    const data = await MODELS_BACKUP.insertMany(dataModel)
    await MODELS.deleteMany({})

    // todo insert data from req.body to model
    const newData = await MODELS.insertMany(req.body.data)
    res.json(newData);
  } catch (error) {
    console.log("🚀 ~ error:", error);
    res.sendStatus(500);
  }
});
router.post("/import", async (req, res, next) => {
  try {
    const deleteData = await MODELS.deleteMany({})
    console.log("🚀 ~ deleteData:", deleteData)
    const data = await MODELS.insertMany(req.body)
    res.json(data);
  } catch (error) {
    console.log("🚀 ~ error:", error);
    res.sendStatus(500);
  }
});
router.put("/createOrUpdate", async (req, res, next) => {
  try {
    let form = req.body.map(item => {
      if (item._id) {
        return {

        }
      } else {

      }
    })
    const data = await MODELS.insertMany(req.body)
    res.json(data);
  } catch (error) {
    console.log("🚀 ~ error:", error);
    res.sendStatus(500);
  }
});

router.post('/getModelInLT', async (req, res, next) => {
  try {
    const { modelLT } = req.body;
    if (!modelLT) {
      return res.status(400).json({
        success: false,
        error: 'modelLT is required'
      });
    }
    let query = `SELECT * FROM code_mst WHERE indiv_cd IN (${modelLT.map(item => `'${item}'`).join(',')})`;
    const result = await oracleHelper.executeQuery(query);
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.log("🚀 ~ error:", error);
    res.sendStatus(500);
  }
})



// ============================================================================
// Oracle Database Example Endpoints
// ============================================================================

/**
 * Example: Query Oracle database with automatic retry
 * GET /model/oracle/test
 */
router.get("/oracle/test", async (req, res, next) => {
  try {
    const result = await oracleHelper.executeQuery(
      'SELECT 1 as test, SYSDATE as current_date FROM DUAL'
    );

    res.json({
      success: true,
      message: 'Oracle connection successful',
      data: result.rows
    });
  } catch (error) {
    console.log("🚀 ~ Oracle test error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Example: Query Oracle table with parameters
 * GET /model/oracle/query?table=your_table&column=your_column&value=your_value
 */
router.get("/oracle/query", async (req, res, next) => {
  try {
    const { table, column, value } = req.query;

    if (!table) {
      return res.status(400).json({
        success: false,
        error: 'Table name is required'
      });
    }

    // Build query safely
    let sql = `SELECT * FROM ${table}`;
    const binds = {};

    if (column && value) {
      sql += ` WHERE ${column} = :value`;
      binds.value = value;
    }

    const result = await oracleHelper.executeQuery(sql, binds, {
      maxRetries: 5,  // Custom retry count
      timeoutMs: 30000 // 30 second timeout
    });

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.log("🚀 ~ Oracle query error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Example: Insert data into Oracle
 * POST /model/oracle/insert
 * Body: { table: "table_name", data: { column1: "value1", column2: "value2" } }
 */
router.post("/oracle/insert", async (req, res, next) => {
  try {
    const { table, data } = req.body;

    if (!table || !data) {
      return res.status(400).json({
        success: false,
        error: 'Table name and data are required'
      });
    }

    // Build insert query
    const columns = Object.keys(data);
    const values = columns.map(col => `:${col}`);
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')})`;

    const result = await oracleHelper.executeQuery(sql, data);

    res.json({
      success: true,
      message: 'Data inserted successfully',
      rowsAffected: result.rowsAffected
    });
  } catch (error) {
    console.log("🚀 ~ Oracle insert error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Example: Execute transaction with multiple queries
 * POST /model/oracle/transaction
 * Body: { queries: [{ sql: "...", binds: {...} }, ...] }
 */
router.post("/oracle/transaction", async (req, res, next) => {
  try {
    const { queries } = req.body;

    if (!queries || !Array.isArray(queries)) {
      return res.status(400).json({
        success: false,
        error: 'Queries array is required'
      });
    }

    const results = await oracleHelper.executeTransaction(queries);

    res.json({
      success: true,
      message: 'Transaction completed successfully',
      results: results.map(r => ({
        rowsAffected: r.rowsAffected
      }))
    });
  } catch (error) {
    console.log("🚀 ~ Oracle transaction error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get Oracle connection pool statistics
 * GET /model/oracle/stats
 */
router.get("/oracle/stats", async (req, res, next) => {
  try {
    const stats = oracleHelper.getPoolStats();

    if (!stats) {
      return res.json({
        success: false,
        message: 'Connection pool not initialized'
      });
    }

    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.log("🚀 ~ Oracle stats error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================


module.exports = router;
