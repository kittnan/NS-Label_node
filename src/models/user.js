const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const model = new Schema(
  {
    password:String,
    employeeCode:String,
    firstName:String,
    lastName:String
  },
  { timestamps: true, versionKey: false, strict: false }
);

const UserModule = mongoose.model("users", model);

module.exports = UserModule;
