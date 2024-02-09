var mongoose = require("mongoose");
mongoose
  .connect(process.env.DATABASE, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then((value) => {
    console.log(
      "mongodb connected" +
      "\n" +
      value.connection._connectionString +
      "\nport: " +
      value.connection.port
    );
  })
  .catch((reason) => console.log(reason));
module.exports = mongoose;
