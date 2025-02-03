const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const model = new Schema(
  {
    sendingDate:Date
  },
  { timestamps: true, versionKey: false, strict: false }
);

const UserModule = mongoose.model("sap_sending", model);

module.exports = UserModule;
