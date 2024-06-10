let express = require("express");
let router = express.Router();
var mongoose = require("mongodb");
const { ObjectId } = mongoose;
const SENDING = require("../models/sending");
let axios = require("axios");
const moment = require("moment");

router.get("/", async (req, res, next) => {
  try {
    let { start, end } = req.query
    let condition = [{
      $match: {}
    }]
    if (start && end) {
      start = JSON.parse(start)
      end = JSON.parse(end)
      condition.push({
        $match: {
          createdAt: {
            $gte: moment(start).startOf('day').toDate(),
            $lte: moment(end).endOf('day').toDate(),
          }
        }
      })
    } else if (start) {
      start = JSON.parse(start)
      condition.push({
        $match: {
          createdAt: {
            $gte: moment(start).startOf('day').toDate(),
          }
        }
      })
    } else if (end) {
      end = JSON.parse(end)
      condition.push({
        $match: {
          createdAt: {
            $lte: moment(end).endOf('day').toDate(),
          }
        }
      })
    }
    const usersQuery = await SENDING.aggregate(condition)
    res.json(usersQuery);
  } catch (error) {
    console.log("🚀 ~ error:", error);
    res.sendStatus(500);
  }
});
router.get("/printTable", async (req, res, next) => {
  try {
    let { start, end } = req.query
    let condition = [{
      $match: {}
    }]
    if (start && end) {
      start = JSON.parse(start)
      end = JSON.parse(end)
      condition.push({
        $match: {
          createdAt: {
            $gte: moment(start).startOf('day').toDate(),
            $lte: moment(end).endOf('day').toDate(),
          }
        }
      })
    } else if (start) {
      start = JSON.parse(start)
      condition.push({
        $match: {
          createdAt: {
            $gte: moment(start).startOf('day').toDate(),
          }
        }
      })
    } else if (end) {
      end = JSON.parse(end)
      condition.push({
        $match: {
          createdAt: {
            $lte: moment(end).endOf('day').toDate(),
          }
        }
      })
    }
    condition.push({
      '$lookup': {
        'from': 'forms',
        'localField': 'runNo',
        'foreignField': 'runNo',
        'as': 'forms'
      }
    })
    const usersQuery = await SENDING.aggregate(condition).sort({createdAt:-1})
    res.json(usersQuery);
  } catch (error) {
    console.log("🚀 ~ error:", error);
    res.sendStatus(500);
  }
});
router.post("/create", async (req, res, next) => {
  try {
    const data = await SENDING.insertMany(req.body)
    res.json(data);
  } catch (error) {
    console.log("🚀 ~ error:", error);
    res.sendStatus(500);
  }
});
router.post("/import", async (req, res, next) => {
  try {
    const deleteData = await SENDING.deleteMany({})
    console.log("🚀 ~ deleteData:", deleteData)
    const data = await SENDING.insertMany(req.body)
    res.json(data);
  } catch (error) {
    console.log("🚀 ~ error:", error);
    res.sendStatus(500);
  }
});
router.post("/createOrUpdate", async (req, res, next) => {
  try {
    let form = req.body.map(item => {
      if (item._id) {
        return {
          updateMany: {
            filter: { _id: new ObjectId(item._id) },
            update: { $set: item }
          }
        }
      } else {
        return {
          insertOne: {
            document: item
          }
        }
      }
    })
    const data = await SENDING.bulkWrite(form)
    res.json(data);
  } catch (error) {
    console.log("🚀 ~ error:", error);
    res.sendStatus(500);
  }
});

module.exports = router;
