let express = require("express");
let router = express.Router();
var mongoose = require("mongodb");
const { ObjectId } = mongoose;

let axios = require('axios')

const jwt = require("jsonwebtoken")
require("dotenv").config()

const USERS = require("../models/user");

router.post("/login", async (req, res) => {
  let payload = req.body
  let user = await USERS.aggregate([
    {
      $match: {
        username: payload.name,
        password: payload.pass
      }
    }
  ])

  user = user?.length > 0 ? user[0] : null
  if (!user) {
    return res.sendStatus(400)
  }

  const access_token = jwtGenerate(user)
  const refresh_token = jwtRefreshTokenGenerate(user)
  const profile = user
  user.refresh = refresh_token

  res.json({
    access_token,
    refresh_token,
    profile

  })
})

router.post("/login-SSO", async (req, res, next) => {
  try {
    const payload = req.body;
    const adAcc = await axios.post("http://10.200.90.152:4038/AzureLogin/getByCondition", {
      username: payload.name,
      password: payload.pass,
    });
    console.log("🚀 ~ adAcc:", adAcc.data);
    if (adAcc?.data == "User not found") {
      const resDB = await USERS.aggregate([
        {
          $match: {
            employeeCode: payload.name,
          },
        },
      ]);
      if (resDB && resDB.length > 0) {
        const profile = resDB[0]
        const access_token = jwtGenerate(profile)
        const refresh_token = jwtRefreshTokenGenerate(profile)
        resDB.refresh = refresh_token

        res.json({
          access_token,
          refresh_token,
          profile,
          adAcc: adAcc.data

        })
      } else {
        throw 'not found user'
      }

    } else {
      const resDB = await USERS.aggregate([
        {
          $match: {
            employeeCode: adAcc.data.description,
          },
        },
      ]);
      const profile = resDB[0]
      const access_token = jwtGenerate(profile)
      const refresh_token = jwtRefreshTokenGenerate(profile)
      resDB.refresh = refresh_token

      res.json({
        access_token,
        refresh_token,
        profile,
        adAcc: adAcc.data
      })
    }
  } catch (error) {
    console.log("🚀 ~ error:", error);
    res.sendStatus(400);
  }
})

const jwtGenerate = (user) => {
  const accessToken = jwt.sign(
    { name: user.employeeCode, id: user._id },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "30m", algorithm: "HS256" }
  )

  return accessToken
}

const jwtRefreshTokenGenerate = (user) => {
  const refreshToken = jwt.sign(
    { name: user.employeeCode, id: user._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "1d", algorithm: "HS256" }
  )

  return refreshToken
}

const jwtValidate = (req, res, next) => {
  try {
    if (!req.headers["authorization"]) return res.sendStatus(401)

    const token = req.headers["authorization"].replace("Bearer ", "")

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) throw new Error(err)
    })
    next()
  } catch (error) {
    return res.sendStatus(403)
  }
}

router.get("/", jwtValidate, async (req, res) => {
  try {
    res.send(200)
  } catch (error) {
    console.log("🚀 ~ error:", error)
  }
})

const jwtRefreshTokenValidate = (req, res, next) => {
  try {
    if (!req.headers["authorization"]) return res.sendStatus(401)
    const token = req.headers["authorization"].replace("Bearer ", "")

    jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
      if (err) throw new Error(err)
      req.user = decoded
      req.user.token = token
      delete req.user.exp
      delete req.user.iat
    })
    next()
  } catch (error) {
    console.log("🚀 ~ error:", error)
    return res.sendStatus(403)
  }
}

router.post("/refresh", jwtRefreshTokenValidate, async (req, res) => {
  let user = await USERS.aggregate([
    {
      $match: {
        employeeCode: req.user.name,
        _id: new ObjectId(req.user.id)
      }
    }
  ])
  user = user?.length > 0 ? user[0] : null
  if (!user) return res.sendStatus(401)

  const access_token = jwtGenerate(user)
  const refresh_token = jwtRefreshTokenGenerate(user)
  user.refresh = refresh_token

  return res.json({
    access_token,
    refresh_token,
  })
})



module.exports = router;
