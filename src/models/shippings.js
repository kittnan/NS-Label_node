const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const model = new Schema(
  {
    shipDate:Date
  },
  { timestamps: true, versionKey: false, strict: false }
);

const UserModule = mongoose.model("shippings", model);

module.exports = UserModule;
