"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class tipe_kamar extends Model {
    static associate(models) {
      // define association here
      this.hasMany(models.kamar, {
        foreignKey: `id_tipe_kamar`,
        as: "kamars",
      });
      this.hasMany(models.pemesanan, {
        foreignKey: `id_tipe_kamar`,
        as: `pemesanans`,
      });
    }
  }
  tipe_kamar.init(
    {
      nama_tipe_kamar: DataTypes.STRING,
      harga: DataTypes.INTEGER,
      deskripsi: DataTypes.STRING,
      foto: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: "tipe_kamar",
    },
  );
  return tipe_kamar;
};
