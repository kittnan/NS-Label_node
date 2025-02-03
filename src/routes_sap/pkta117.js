let express = require("express");
let router = express.Router();
var mongoose = require("mongodb");
const { ObjectId } = mongoose;
const PKTA117 = require("../models_sap/pkta117");

router.get("/", async (req, res, next) => {
  try {
    let { kydCD, customerPO } = req.query
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
    if (customerPO) {
      customerPO = JSON.parse(customerPO)
      condition.push({
        $match: {
          "Customer SO#": {
            $in: customerPO
          }
        }
      })
    }
    const usersQuery = await PKTA117.aggregate(condition)
    res.json(usersQuery);
  } catch (error) {
    console.log("🚀 ~ error:", error);
    res.sendStatus(500);
  }
});
router.post("/create", async (req, res, next) => {
  try {
    const data = await PKTA117.insertMany(req.body)
    res.json(data);
  } catch (error) {
    console.log("🚀 ~ error:", error);
    res.sendStatus(500);
  }
});
router.post("/import", async (req, res, next) => {
  try {
    const deleteData = await PKTA117.deleteMany({})
    console.log("🚀 ~ deleteData:", deleteData)
    const data = await PKTA117.insertMany(req.body)
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
    const data = await PKTA117.insertMany(req.body)
    res.json(data);
  } catch (error) {
    console.log("🚀 ~ error:", error);
    res.sendStatus(500);
  }
});

module.exports = router;
