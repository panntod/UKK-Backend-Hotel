"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class pemesanan extends Model {
    static associate(models) {
      this.hasMany(models.detail_pemesanan, {
        foreignKey: "id_pemesanan",
        as: "details_of_pemesanan",
      });
      this.belongsTo(models.user);
      this.belongsTo(models.tipe_kamar, { foreignKey: 'id_tipe_kamar' });
    }
  }

  pemesanan.init(
    {
      nomor_pemesanan: DataTypes.INTEGER,
      nama_pemesanan: DataTypes.STRING,
      email_pemesanan: DataTypes.STRING,
      tgl_pemesanan: DataTypes.DATE,
      tgl_check_in: DataTypes.DATE,
      tgl_check_out: DataTypes.DATE,
      nama_tamu: DataTypes.STRING,
      jumlah_kamar: DataTypes.INTEGER,
      id_tipe_kamar: DataTypes.INTEGER,
      status_pemesanan: DataTypes.ENUM("baru", "checkin", "checkout"),
      id_user: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "pemesanan",
    },
  );
  return pemesanan;
};
