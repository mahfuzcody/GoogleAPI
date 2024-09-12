const dbConfig = require("../config/db");
const { Sequelize, DataTypes } = require("sequelize");

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  operationsAliases: false,
  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle,
  },
});
sequelize
  .authenticate()
  .then(() => {
    console.log("connected ....");
  })
  .catch((error) => {
    console.log("Error" + error);
  });

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.contacts=require("./contacts")(sequelize, DataTypes);

db.sequelize.sync({ force: false }).then(() => {
  console.log("re-sync done!");
});

module.exports = db;