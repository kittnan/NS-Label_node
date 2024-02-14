let express = require("express");
let router = express.Router();
var mongoose = require("mongodb");
const { ObjectId } = mongoose;
const FORM = require("../models/form");
let axios = require("axios");
const moment = require("moment");

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
    const usersQuery = await FORM.aggregate(condition)
    res.json(usersQuery);
  } catch (error) {
    console.log("🚀 ~ error:", error);
    res.sendStatus(500);
  }
});

router.get("/runNo", async (req, res, next) => {
  try {
    let last = await FORM.aggregate([
      {
        $match: {
          createdAt: {
            $gte: moment().startOf('year').toDate(),
            $lte: moment().endOf('year').toDate()
          }
        }
      }
    ]).sort({ runNo: 1 }).limit(1)
    console.log("🚀 ~ last:", last)
    if (last && last.length>0) {
      let runNo = last[0]['runNo']
      const number = Number(runNo.split('-')[2]) + 1
      const str = number.toString().padStart(6, '0')
      res.json({
        runNo: `${moment().format('YYYY')}-${moment().format('MM')}-${str}`
      })
    } else {
      const number = 1
      const str = number.toString().padStart(6, '0')
      res.json({
        runNo: `${moment().format('YYYY')}-${moment().format('MM')}-${str}`
      })
    }
  } catch (error) {
    console.log("🚀 ~ error:", error)
    res.sendStatus(500)
  }
})
router.post("/create", async (req, res, next) => {
  try {
    const data = await FORM.insertMany(req.body)
    res.json(data);
  } catch (error) {
    console.log("🚀 ~ error:", error);
    res.sendStatus(500);
  }
});
router.post("/import", async (req, res, next) => {
  try {
    const deleteData = await FORM.deleteMany({})
    console.log("🚀 ~ deleteData:", deleteData)
    const data = await FORM.insertMany(req.body)
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
    const data = await FORM.insertMany(req.body)
    res.json(data);
  } catch (error) {
    console.log("🚀 ~ error:", error);
    res.sendStatus(500);
  }
});

module.exports = router;
