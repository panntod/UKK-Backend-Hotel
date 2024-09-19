const { sequelize } = require("../config/database.js");
const Op = require(`sequelize`).Op;
const moment = require("moment");

const { kamar: roomModel, tipe_kamar: tipeModel } = require(`../models/index`);

exports.getAllRoom = async (_, res) => {
  const result = await sequelize.query(
    "SELECT kamars.id,kamars.nomor_kamar,tipe_kamars.nama_tipe_kamar FROM kamars JOIN tipe_kamars ON tipe_kamars.id = kamars.id_tipe_kamar ORDER BY kamars.id DESC",
  );

  if (result[0].length === 0) {
    return res.status(400).json({
      success: false,
      message: "Data tidak ditemukan",
    });
  }
  return res.json({
    success: true,
    data: result[0],
    message: `Berhasil mendapatkan data`,
  });
};

exports.findRoom = async (req, res) => {
  let nomor_kamar = req.params.nomor_kamar;

  const result = await sequelize.query(
    `SELECT kamars.id,kamars.nomor_kamar,tipe_kamars.nama_tipe_kamar FROM kamars JOIN tipe_kamars ON tipe_kamars.id = kamars.id_tipe_kamar where kamars.nomor_kamar= ${nomor_kamar} ORDER BY kamars.id DESC `,
  );

  if (result[0].length === 0) {
    return res.status(400).json({
      success: false,
      message: "Data tidak ditemukan",
    });
  }

  return res.json({
    success: true,
    data: result[0],
    message: `Berhasil mendapatkan data`,
  });
};

exports.findRoomById = async (req, res) => {
  let idRoom = req.params.id;

  const result = await sequelize.query(
    `SELECT kamars.id,kamars.nomor_kamar,kamars.id_tipe_kamar, tipe_kamars.nama_tipe_kamar FROM kamars JOIN tipe_kamars ON tipe_kamars.id = kamars.id_tipe_kamar where kamars.id = ${idRoom} ORDER BY kamars.id ASC `,
  );

  if (result[0].length === 0) {
    return res.status(400).json({
      success: false,
      message: "Data tidak ditemukan",
    });
  }

  return res.json({
    success: true,
    data: result[0],
    message: `Berhasil mendapatkan data`,
  });
};

exports.addRoom = async (req, res) => {
  let nama_tipe_kamar = req.body.nama_tipe_kamar;
  let tipeId = await tipeModel.findOne({
    where: {
      [Op.and]: [{ nama_tipe_kamar: { [Op.substring]: nama_tipe_kamar } }],
    },
  });

  if (!tipeId) {
    return res.status(400).json({
      success: false,
      message: `Tipe kamar yang anda inputkan tidak ada`,
    });
  } else {
    let newRoom = {
      nomor_kamar: req.body.nomor_kamar,
      id_tipe_kamar: tipeId.id,
    };

    if (newRoom.nomor_kamar === "" || nama_tipe_kamar === "") {
      return res.status(400).json({
        success: false,
        message: `Mohon mengisi semua field`,
      });
    }

    let kamars = await roomModel.findAll({
      where: {
        nomor_kamar: newRoom.nomor_kamar,
      },
      attributes: ["id", "nomor_kamar", "id_tipe_kamar"],
    });
    if (kamars.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Kamar yang anda inputkan sudah ada`,
      });
    }
    roomModel
      .create(newRoom)
      .then((result) => {
        return res.json({
          success: true,
          data: result,
          message: `Berhasil menambahkan data`,
        });
      })
      .catch((error) => {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      });
  }
};

exports.updateRoom = async (req, res) => {
  let nama_tipe_kamar = req.body.nama_tipe_kamar;
  let tipeId = await tipeModel.findOne({
    where: {
      [Op.and]: [{ nama_tipe_kamar: { [Op.substring]: nama_tipe_kamar } }],
    },
  });
  console.log(nama_tipe_kamar);

  if (tipeId === null) {
    return res.status(400).json({
      success: false,
      message: `Tipe kamar yang anda inputkan tidak ada`,
    });
  } else {
    let newRoom = {
      nomor_kamar: req.body.nomor_kamar,
      id_tipe_kamar: tipeId.id,
    };
    if (newRoom.nomor_kamar === "" || nama_tipe_kamar === "") {
      return res.status(400).json({
        success: false,
        message:
          "Harus diisi semua kalau tidak ingin merubah, isi dengan value sebelumnya",
      });
    }

    let idRoom = req.params.id;
    let getId = await roomModel.findAll({
      where: {
        [Op.and]: [{ id: idRoom }],
      },
      attributes: ["id", "nomor_kamar", "id_tipe_kamar"],
    });
    if (getId.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Kamar dengan id tersebut tidak ada",
      });
    }

    let kamars = await roomModel.findAll({
      where: {
        [Op.and]: [
          { id: { [Op.ne]: idRoom } },
          {
            [Op.or]: [{ nomor_kamar: newRoom.nomor_kamar }],
          },
        ],
      },
      attributes: ["id", "nomor_kamar", "id_tipe_kamar"],
    });
    if (kamars.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Kamar yang anda inputkan sudah ada`,
      });
    }

    roomModel
      .update(newRoom, { where: { id: idRoom } })
      .then((result) => {
        return res.json({
          success: true,
          message: `Berhasil mengupdate data`,
        });
      })
      .catch((error) => {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      });
  }
};

exports.deleteRoom = async (req, res) => {
  let idRoom = req.params.id;

  const room = await roomModel.findAll({
    where: { [Op.and]: [{ id: idRoom }] },
    attributes: [
      "id",
      "nomor_kamar",
      "id_tipe_kamar",
      "createdAt",
      "updatedAt",
    ],
  });

  if (room.length === 0) {
    return res.json({
      success: false,
      message: `Tidak ada kamar dengan id tersebut`,
    });
  }

  roomModel
    .destroy({ where: { id: idRoom } })
    .then((result) => {
      return res.json({
        success: true,
        message: `Berhasil menghapus data`,
      });
    })
    .catch((error) => {
      return res.json({
        success: false,
        message: error.message,
      });
    });
};

exports.availableRoom = async (req, res) => {
  let tgl1 = moment(req.body.check_in);
  let tgl2 = moment(req.body.check_out);

  if (tgl2.isBefore(tgl1)) {
    return res.json({
      success: false,
      message: "Masukkan tanggal yang benar",
    });
  }

  tgl1 = tgl1.format("YYYY-MM-DD");
  tgl2 = tgl2.format("YYYY-MM-DD");

  const result = await sequelize.query(
    `SELECT tipe_kamars.nama_tipe_kamar, kamars.nomor_kamar FROM kamars LEFT JOIN tipe_kamars ON kamars.id_tipe_kamar = tipe_kamars.id LEFT JOIN detail_pemesanans ON detail_pemesanans.id_kamar = kamars.id WHERE kamars.id NOT IN (SELECT id_kamar from detail_pemesanans WHERE tgl_akses BETWEEN '${tgl1}' AND '${tgl2}') GROUP BY kamars.nomor_kamar`,
  );

  if (result[0].length === 0) {
    return res.json({
      success: false,
      message: `Tidak ada kamar yang tersedia di antara tanggal itu`,
    });
  }

  return res.json({
    success: true,
    sisa_kamar: result[0].length,
    data: result[0],
    message: `Berhasil mendapatkan data`,
  });
};

exports.availableRoomSingleDate = async (req, res) => {
  try {
    const tgl_akses = new Date(req.params.tgl_akses);
    let tgl = moment(tgl_akses).format("YYYY-MM-DD");

    const result = await sequelize.query(
      `SELECT kamars.nomor_kamar 
       FROM kamars 
       LEFT JOIN tipe_kamars ON kamars.id_tipe_kamar = tipe_kamars.id 
       LEFT JOIN detail_pemesanans ON detail_pemesanans.id_kamar = kamars.id 
       WHERE kamars.id NOT IN (SELECT id_kamar FROM detail_pemesanans WHERE tgl_akses = '${tgl}') 
       GROUP BY kamars.nomor_kamar`,
    );

    if (result[0].length === 0) {
      return res.json({
        success: false,
        message: "Tidak ada kamar yang tersedia di tanggal itu",
      });
    }

    const data = result[0].map((kamar) => kamar.nomor_kamar);

    return res.json({
      success: true,
      data: data,
      message: "Berhasil mendapatkan data",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat memproses permintaan",
    });
  }
};

exports.availableRoomWithType = async (req, res) => {
  const nama_tipe = req.body.nama_tipe;
  let tgl1 = moment(req.body.check_in);
  let tgl2 = moment(req.body.check_out);

  if (tgl2.isBefore(tgl1)) {
    return res.json({
      success: false,
      message: "Masukkan tanggal yang benar",
    });
  }

  tgl1 = tgl1.format("YYYY-MM-DD");
  tgl2 = tgl2.format("YYYY-MM-DD");

  const result = await sequelize.query(
    `SELECT tipe.nama_tipe_kamar, kamar.nomor_kamar
      FROM kamars  as kamar JOIN tipe_kamars as tipe ON kamar.id_tipe_kamar = tipe.id
      WHERE tipe.nama_tipe_kamar='${nama_tipe}' AND kamar.id NOT IN ( SELECT id_kamar FROM detail_pemesanans as dp join pemesanans as p ON p.id = dp.id_pemesanan WHERE p.status_pemesanan != 'checkout' AND dp.tgl_akses BETWEEN "${tgl1}" AND "${tgl2}" ) GROUP BY kamar.id ORDER BY kamar.id DESC `,
  );

  if (result[0].length === 0) {
    return res.json({
      success: false,
      data: `Data tidak ditemukan`,
      sisa_kamar: 0,
    });
  }

  return res.json({
    success: true,
    sisa_kamar: result[0].length,
    data: result[0],
    message: `Berhasil mendapatkan data`,
  });
};

exports.getRoomLength = async (req, res) => {
  try {
    let room = await roomModel.count();
    return res.json({
      success: true,
      jumlah_kamar: room,
    });
  } catch (error) {
    console.log(error);
    return res.json({
      success: false,
      message: error,
    });
  }
};
