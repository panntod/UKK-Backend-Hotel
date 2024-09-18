const { Sequelize } = require("sequelize");

exports.sequelize = new Sequelize("hotel", "root", "", {
  host: "localhost",
  dialect: "mysql",
});
