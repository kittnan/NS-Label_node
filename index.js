let express = require("express");
let bodyParser = require("body-parser");
let cors = require("cors");
let app = express();
let morgan = require("morgan");
let mongoose = require("mongoose");
let compression = require("compression");
const jwt = require("jsonwebtoken")

mongoose.set("strictQuery", false);

const dotenv = require("dotenv");

dotenv.config({ path: `.env.${process.env.NODE_ENV}` });
console.log("PORT:", process.env.PORT);
let mongooseConnect = require("./connect");
const port = process.env.PORT;
const server = app.listen(port, () => {
  console.log("Listening on  port " + server.address().port);
});

app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST ,PUT ,DELETE");
  res.setHeader("Access-Control-Allow-Headers", "X-Requested-with,Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", true);
  next();
});


const jwtValidate = (req, res, next) => {
  try {
    if (!req.headers["authorization"]) return res.sendStatus(401);

    const token = req.headers["authorization"].replace("Bearer ", "");
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        console.error("JWT verification error:", err.message);
        return res.sendStatus(403); // Forbidden
      }
      next(); // Move to the next middleware
    });
  } catch (error) {
    console.error("JWT validation error:", error.message);
    return res.sendStatus(403); // Forbidden
  }
};



app.use(morgan("tiny"));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(cors());
app.use(compression());

app.use("/model", jwtValidate, require("./src/routes/models"));
app.use("/pkta117", jwtValidate, require("./src/routes/pkta117"));
app.use("/user", jwtValidate, require("./src/routes/user"));
app.use("/shipping", jwtValidate, require("./src/routes/shippings"));
app.use("/sending", jwtValidate, require("./src/routes/sending"));
app.use("/auth", require("./src/routes/auth"));


app.use("/sap/pkta117", jwtValidate, require("./src/routes_sap/pkta117"));
app.use("/sap/shipping", jwtValidate, require("./src/routes_sap/shippings"));
app.use("/sap/sending", jwtValidate, require("./src/routes_sap/sending"));




module.exports = app;
