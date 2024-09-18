"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class kamar extends Model {
    static associate(models) {
      this.belongsTo(models.tipe_kamar);
    }
  }
  kamar.init(
    {
      nomor_kamar: DataTypes.INTEGER,
      id_tipe_kamar: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "kamar",
    },
  );
  return kamar;
};
