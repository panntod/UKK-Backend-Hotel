const moment = require("moment");
const randomstring = require("randomstring");
const { sequelize } = require("../config/database");
const Op = require(`sequelize`).Op;

const {
  pemesanan: pemesananModel,
  detail_pemesanan: detailsOfPemesananModel,
  user: userModel,
  kamar: roomModel,
  tipe_kamar: tipeModel,
} = require(`../models/index`);

exports.getAllPemesanan = async (_, res) => {
  try {
    const [result] = await sequelize.query(`
      SELECT 
        pemesanans.id,
        pemesanans.nama_pemesanan,
        pemesanans.email_pemesanan,
        pemesanans.tgl_pemesanan,
        pemesanans.tgl_check_in,
        pemesanans.tgl_check_out,
        pemesanans.nama_tamu,
        pemesanans.jumlah_kamar,
        pemesanans.status_pemesanan,
        users.nama_user,
        tipe_kamars.nama_tipe_kamar,
        GROUP_CONCAT(kamars.nomor_kamar ORDER BY kamars.nomor_kamar) AS nomor_kamar,
        detail_pemesanans.harga
      FROM pemesanans
      JOIN tipe_kamars ON tipe_kamars.id = pemesanans.id_tipe_kamar
      LEFT JOIN users ON users.id = pemesanans.id_user
      JOIN detail_pemesanans ON detail_pemesanans.id_pemesanan = pemesanans.id
      JOIN kamars ON kamars.id = detail_pemesanans.id_kamar
      GROUP BY pemesanans.id
      ORDER BY pemesanans.id DESC;
    `);

    if (result.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Data tidak ditemukan",
      });
    }

    const data = result.map((pemesanan) => ({
      id: pemesanan.id,
      nomor_pemesanan: pemesanan.nomor_pemesanan,
      nama_pemesanan: pemesanan.nama_pemesanan,
      email_pemesanan: pemesanan.email_pemesanan,
      tgl_pemesanan: pemesanan.tgl_pemesanan,
      tgl_check_in: pemesanan.tgl_check_in,
      tgl_check_out: pemesanan.tgl_check_out,
      nama_tamu: pemesanan.nama_tamu,
      jumlah_kamar: pemesanan.jumlah_kamar,
      harga: pemesanan.harga,
      status_pemesanan: pemesanan.status_pemesanan,
      nama_user: pemesanan.nama_user,
      nama_tipe_kamar: pemesanan.nama_tipe_kamar,
      nomor_kamar: pemesanan.nomor_kamar.split(","),
    }));

    return res.json({
      success: true,
      data: data,
      message: "All transactions have been loaded",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server",
      error: error.message,
    });
  }
};

exports.addPemesanan = async (req, res) => {
  try {
    const userCheck = await userModel.findOne({
      where: { nama_user: { [Op.substring]: req.body.nama_user } },
    });

    if (!userCheck) {
      return res.status(400).json({
        success: false,
        message: "User yang anda inputkan tidak ada",
      });
    }

    const { check_in, check_out } = req.body;

    if (moment(check_out).isBefore(check_in)) {
      return res.status(400).json({
        success: false,
        message: "Masukkan tanggal yang benar",
      });
    }

    const tipeRoomCheck = await tipeModel.findOne({
      where: { nama_tipe_kamar: req.body.tipe_kamar },
      attributes: [
        "id",
        "nama_tipe_kamar",
        "harga",
        "deskripsi",
        "foto",
        "createdAt",
        "updatedAt",
      ],
    });

    if (!tipeRoomCheck) {
      return res.status(400).json({
        success: false,
        message: "Tidak ada tipe kamar dengan nama itu",
      });
    }

    const availableRooms = await sequelize.query(
      `
      SELECT kamars.nomor_kamar, kamars.id FROM kamars
      LEFT JOIN detail_pemesanans ON detail_pemesanans.id_kamar = kamars.id
      WHERE kamars.id_tipe_kamar = :idTipeKamar
      AND kamars.id NOT IN (
        SELECT id_kamar FROM detail_pemesanans 
        WHERE tgl_akses BETWEEN :check_in AND :check_out
      )
      GROUP BY kamars.nomor_kamar, kamars.id
      LIMIT 1
    `,
      {
        replacements: { idTipeKamar: tipeRoomCheck.id, check_in, check_out },
        type: sequelize.QueryTypes.SELECT,
      },
    );

    if (availableRooms.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Kamar dengan tipe itu dan di tanggal itu sudah terbooking",
      });
    }

    const randomRoom = availableRooms[0];

    let tgl_pemesanan = moment().format("YYYY-MM-DD");
    let nomorPem = `${randomstring.generate(12)}-${tgl_pemesanan}`;

    const newPemesanan = {
      nomor_pemesanan: nomorPem,
      nama_pemesanan: req.body.nama_pemesanan,
      email_pemesanan: req.body.email_pemesanan,
      tgl_pemesanan,
      tgl_check_in: check_in,
      tgl_check_out: check_out,
      nama_tamu: req.body.nama_tamu,
      jumlah_kamar: 1,
      id_tipe_kamar: tipeRoomCheck.id,
      status_pemesanan: "baru",
      id_user: userCheck.id,
    };

    const pemesanan = await pemesananModel.create(newPemesanan);

    const nights = moment(check_out).diff(moment(check_in), "days");
    const totalHarga = nights * tipeRoomCheck.harga;

    const details = [];
    for (let i = 0; i < nights; i++) {
      details.push({
        id_pemesanan: pemesanan.id,
        id_kamar: randomRoom.id,
        tgl_akses: moment(check_in).add(i, "days").format("YYYY-MM-DD"),
        harga: totalHarga,
      });
    }

    await detailsOfPemesananModel.bulkCreate(details);

    return res.json({
      success: true,
      nomor_pemesanan: nomorPem,
      message: "Berhasil menambahkan data",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.addPemesananManual = async (req, res) => {
  try {
    const { nama_user, tipe_kamar, nomor_kamar, check_in, check_out } =
      req.body;

    const userCheck = await userModel.findOne({
      where: { nama_user: { [Op.substring]: nama_user } },
    });

    if (!userCheck) {
      return res.status(400).json({
        success: false,
        message: "User yang anda inputkan tidak ada",
      });
    }

    const date1 = moment(check_in);
    const date2 = moment(check_out);

    if (date2.isBefore(date1)) {
      return res.status(400).json({
        success: false,
        message: "Masukkan tanggal yang benar",
      });
    }

    const tipeRoomCheck = await tipeModel.findOne({
      where: { nama_tipe_kamar: tipe_kamar },
      attributes: ["id", "harga"],
    });

    if (!tipeRoomCheck) {
      return res.status(400).json({
        success: false,
        message: "Tidak ada tipe kamar dengan nama itu",
      });
    }

    const room = await roomModel.findOne({
      where: {
        nomor_kamar: nomor_kamar,
        id_tipe_kamar: tipeRoomCheck.id,
      },
    });

    if (!room) {
      return res.status(400).json({
        success: false,
        message: "Kamar dengan nomor itu tidak ada",
      });
    }

    const roomCheck = await sequelize.query(
      `
      SELECT * FROM detail_pemesanans
      WHERE id_kamar = :id_kamar
      AND tgl_akses BETWEEN :check_in AND :check_out
    `,
      {
        replacements: { id_kamar: room.id, check_in, check_out },
        type: sequelize.QueryTypes.SELECT,
      },
    );

    if (roomCheck.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Kamar dengan nomor itu sudah dibooking di hari itu",
      });
    }

    let tgl_pemesanan = moment().format("YYYY-MM-DD");
    let nomorPem = `${randomstring.generate(12)}-${tgl_pemesanan}`;

    const newPemesanan = {
      nomor_pemesanan: nomorPem,
      nama_pemesanan: req.body.nama_pemesanan,
      email_pemesanan: req.body.email_pemesanan,
      tgl_pemesanan,
      tgl_check_in: check_in,
      tgl_check_out: check_out,
      nama_tamu: req.body.nama_tamu,
      jumlah_kamar: 1,
      id_tipe_kamar: room.id_tipe_kamar,
      status_pemesanan: "baru",
      id_user: userCheck.id,
    };

    const pemesanan = await pemesananModel.create(newPemesanan);
    const details = [];
    const nights = date2.diff(date1, "days");
    const totalHarga = nights * tipeRoomCheck.harga;

    for (let m = moment(check_in); m.isBefore(check_out); m.add(1, "days")) {
      details.push({
        id_pemesanan: pemesanan.id,
        id_kamar: room.id,
        tgl_akses: m.format("YYYY-MM-DD"),
        harga: totalHarga,
      });
    }

    await detailsOfPemesananModel.bulkCreate(details);

    return res.json({
      success: true,
      nomor_pemesanan: nomorPem,
      message: "Berhasil membuat transaksi",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.addDoublePemesanan = async (req, res) => {
  console.log("Menjalankan Double Pesanan");
  try {
    const {
      nama_user,
      tipe_kamar,
      check_in,
      check_out,
      nama_pemesanan,
      email_pemesanan,
      nama_tamu,
      jumlah_kamar,
    } = req.body;

    const userId = await userModel.findOne({
      where: { [Op.and]: [{ nama_user }] },
    });

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: `User yang anda inputkan tidak ada`,
      });
    }

    const tgl_pemesanan = moment().format("YYYY-MM-DD");
    const nomorPem = `${randomstring.generate(12)}-${tgl_pemesanan}`;

    const date1 = moment(check_in);
    const date2 = moment(check_out);

    if (date2.isBefore(date1)) {
      return res.status(400).json({
        success: false,
        message: "Masukkan tanggal yang benar",
      });
    }

    const tipeRoomCheck = await tipeModel.findOne({
      where: { [Op.and]: [{ nama_tipe_kamar: tipe_kamar }] },
      attributes: [
        "id",
        "nama_tipe_kamar",
        "harga",
        "deskripsi",
        "foto",
        "createdAt",
        "updatedAt",
      ],
    });

    if (!tipeRoomCheck) {
      return res.status(400).json({
        success: false,
        message: `Tidak ada tipe kamar dengan nama itu`,
      });
    }

    const result = await sequelize.query(`
      SELECT tipe_kamars.nama_tipe_kamar, kamars.nomor_kamar 
      FROM kamars 
      LEFT JOIN tipe_kamars ON kamars.id_tipe_kamar = tipe_kamars.id 
      LEFT JOIN detail_pemesanans ON detail_pemesanans.id_kamar = kamars.id 
      WHERE kamars.id NOT IN (
        SELECT id_kamar FROM detail_pemesanans 
        WHERE tgl_akses BETWEEN '${check_in}' AND '${check_out}'
      ) 
      AND tipe_kamars.nama_tipe_kamar = '${tipe_kamar}' 
      GROUP BY kamars.nomor_kamar
    `);

    if (result[0].length === 0) {
      return res.status(400).json({
        success: false,
        message: `Kamar dengan tipe itu dan di tanggal itu sudah terbooking`,
      });
    }

    const availableRooms = result[0].map((room) => room.nomor_kamar);

    if (availableRooms.length < jumlah_kamar) {
      return res.status(400).json({
        success: false,
        message: `Hanya ada ${availableRooms.length} kamar tersedia`,
      });
    }

    const randomElement = availableRooms.slice(0, jumlah_kamar).map(Number);

    const roomId = await Promise.all(
      randomElement.map(async (nomor) => {
        return await roomModel.findOne({
          where: { [Op.and]: [{ nomor_kamar: nomor }] },
          attributes: [
            "id",
            "nomor_kamar",
            "id_tipe_kamar",
            "createdAt",
            "updatedAt",
          ],
        });
      }),
    );

    const checkType = await tipeModel.findOne({
      where: { [Op.and]: [{ id: roomId[0].id_tipe_kamar }] },
      attributes: [
        "id",
        "nama_tipe_kamar",
        "harga",
        "deskripsi",
        "foto",
        "createdAt",
        "updatedAt",
      ],
    });

    const roomPrice = checkType.harga * jumlah_kamar;

    const newData = {
      nomor_pemesanan: nomorPem,
      nama_pemesanan,
      email_pemesanan,
      tgl_pemesanan,
      tgl_check_in: check_in,
      tgl_check_out: check_out,
      nama_tamu,
      jumlah_kamar,
      id_tipe_kamar: checkType.id,
      status_pemesanan: "baru",
      id_user: userId.id,
    };

    const nights = moment
      .duration(moment(check_out).diff(moment(check_in)))
      .asDays();
    const totalHarga = nights * roomPrice;

    for (const [key, value] of Object.entries(newData)) {
      if (!value || value === "") {
        return res.status(400).json({ error: `${key} kosong mohon di isi` });
      }
    }

    const pemesanan = await pemesananModel.create(newData);
    const pemesananID = pemesanan.id;

    for (let m = moment(check_in); m.isBefore(check_out); m.add(1, "days")) {
      const date = m.format("YYYY-MM-DD");
      const newDetail = roomId.map((room) => ({
        id_pemesanan: pemesananID,
        id_kamar: room.id,
        tgl_akses: date,
        harga: totalHarga,
      }));

      await detailsOfPemesananModel.bulkCreate(newDetail);
    }

    return res.json({
      success: true,
      nomor_pemesanan: nomorPem,
      message: `Berhasil membuat transaksi`,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.addDoublePemesananManual = async (req, res) => {
  console.log("Menjalankan double manual");
  const {
    nama_user,
    check_in,
    check_out,
    tipe_kamar,
    nomor_kamar,
    nama_pemesanan,
    email_pemesanan,
    nama_tamu,
  } = req.body;

  try {
    let user = await userModel.findOne({ where: { nama_user } });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User tidak ditemukan" });
    }

    const checkInDate = moment(check_in);
    const checkOutDate = moment(check_out);
    if (checkOutDate.isBefore(checkInDate)) {
      return res.status(400).json({
        success: false,
        message: "Masukan tanggal yang benar",
      });
    }

    let tipeRoom = await tipeModel.findOne({
      where: { nama_tipe_kamar: tipe_kamar },
    });
    if (!tipeRoom) {
      return res
        .status(400)
        .json({ success: false, message: "Tipe kamar tidak ditemukan" });
    }

    let roomIds = [];
    for (let nomor of nomor_kamar) {
      let room = await roomModel.findOne({
        where: { nomor_kamar: nomor, id_tipe_kamar: tipeRoom.id },
      });
      if (!room) {
        return res.status(400).json({
          success: false,
          message: `Nomor kamar ${nomor} tidak tersedia untuk tipe kamar ${tipe_kamar}`,
        });
      }
      roomIds.push(room.id);
    }

    const availableRooms = await sequelize.query(`
      SELECT kamar.id FROM kamars kamar 
      WHERE kamar.id IN (${roomIds.join(",")}) 
      AND kamar.id NOT IN (
        SELECT detail.id_kamar 
        FROM detail_pemesanans detail 
        WHERE detail.tgl_akses BETWEEN '${checkInDate.format("YYYY-MM-DD")}' AND '${checkOutDate.format("YYYY-MM-DD")}'
      )`);

    if (availableRooms[0].length !== 2) {
      return res.status(400).json({
        success: false,
        message: "Satu atau lebih kamar tidak tersedia untuk tanggal tersebut",
      });
    }

    let tgl_pemesanan = moment().format("YYYY-MM-DD");
    let nomorPem = `${randomstring.generate(12)}-${tgl_pemesanan}`;

    const nights = checkOutDate.diff(checkInDate, "days");
    const totalHarga = tipeRoom.harga * nights * nomor_kamar.length;

    const pemesanan = await pemesananModel.create({
      nomor_pemesanan: nomorPem,
      nama_pemesanan,
      email_pemesanan,
      tgl_pemesanan,
      tgl_check_in: checkInDate,
      tgl_check_out: checkOutDate,
      nama_tamu,
      jumlah_kamar: nomor_kamar.length,
      id_tipe_kamar: tipeRoom.id,
      status_pemesanan: "baru",
      id_user: user.id,
    });

    for (
      let m = moment(checkInDate);
      m.isBefore(checkOutDate);
      m.add(1, "days")
    ) {
      for (let roomId of roomIds) {
        await detailsOfPemesananModel.create({
          id_pemesanan: pemesanan.id,
          id_kamar: roomId,
          tgl_akses: m.format("YYYY-MM-DD"),
          harga: totalHarga,
        });
      }
    }
    return res.status(200).json({
      success: true,
      nomor_pemesanan: nomorPem,
      message: "Pemesanan berhasil dibuat",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updatePemesanan = async (req, res) => {
  let nama_user = req.body.nama_user;
  let userCheck = await userModel.findOne({
    where: {
      [Op.and]: [{ nama_user: { [Op.substring]: nama_user } }],
    },
  });
  if (!userCheck) {
    return res.status(400).json({
      success: false,
      message: `User yang anda inputkan tidak ada`,
    });
  } else {
    let tgl_pemesanan = moment().format("YYYY-MM-DD");
    const random = randomstring.generate(12);
    let nomorPem = `${random}${tgl_pemesanan}`;

    const date1 = moment(req.body.check_in);
    const date2 = moment(req.body.check_out);

    if (date2.isBefore(date1)) {
      return res.status(400).json({
        success: false,
        message: "masukkan tanggal yang benar",
      });
    }
    let tipe_kamar = req.body.tipe_kamar;

    let tipeRoomCheck = await tipeModel.findOne({
      where: {
        [Op.and]: [{ nama_tipe_kamar: tipe_kamar }],
      },
      attributes: [
        "id",
        "nama_tipe_kamar",
        "harga",
        "deskripsi",
        "foto",
        "createdAt",
        "updatedAt",
      ],
    });
    console.log(tipeRoomCheck);
    if (tipeRoomCheck === null) {
      return res.status(400).json({
        success: false,
        message: `Tidak ada tipe kamar dengan nama itu`,
      });
    }

    let nomor_kamar = req.body.nomor_kamar;

    let room = await roomModel.findOne({
      where: {
        [Op.and]: [
          { nomor_kamar: nomor_kamar },
          { id_tipe_kamar: tipeRoomCheck.id },
        ],
      },
      attributes: [
        "id",
        "nomor_kamar",
        "id_tipe_kamar",
        "createdAt",
        "updatedAt",
      ],
    });

    if (!room) {
      return res.status(400).json({
        success: false,
        message: `Kamar dengan nomor itu tidak ada`,
      });
    }

    let roomPrice = await tipeModel.findOne({
      where: {
        [Op.and]: [{ id: room.id_tipe_kamar }],
      },
      attributes: [
        "id",
        "nama_tipe_kamar",
        "harga",
        "deskripsi",
        "foto",
        "createdAt",
        "updatedAt",
      ],
    });

    let newData = {
      nomor_pemesanan: nomorPem,
      nama_pemesanan: req.body.nama_pemesanan,
      email_pemesanan: req.body.email_pemesanan,
      tgl_pemesanan: tgl_pemesanan,
      tgl_check_in: date1,
      tgl_check_out: date2,
      nama_tamu: req.body.nama_tamu,
      jumlah_kamar: nomor_kamar.length || 1,
      id_tipe_kamar: room.id_tipe_kamar,
      status_pemesanan: req.body.status_pemesanan,
      id_user: userCheck.id,
    };

    let roomCheck = await sequelize.query(
      `SELECT * FROM detail_pemesanans WHERE id_kamar = '${room.id}' AND tgl_akses BETWEEN '${newData.tgl_check_in}' AND '${newData.tgl_check_out}' AND detail_pemesanans.id_pemesanan !=${req.params.id} `,
    );

    if (roomCheck[0].length > 0) {
      return res.status(400).json({
        success: false,
        message: `Kamar dengan nomor itu sudah di booking di hari itu`,
      });
    }

    const startDate = moment(newData.tgl_check_in);
    const endDate = moment(newData.tgl_check_out);
    const duration = moment.duration(endDate.diff(startDate));
    const nights = duration.asDays();
    const harga = nights * roomPrice.harga;

    for (const [key, value] of Object.entries(newData)) {
      if (!value || value === "") {
        console.log(`Error: ${key} is empty`);
        return res.status(400).json({ error: `${key} kosong mohon di isi` });
      }
    }

    let idPemesanan = req.params.id;

    pemesananModel
      .update(newData, { where: { id: idPemesanan } })
      .then(async (result) => {
        let checkIn = moment(newData.tgl_check_in, "YYYY-MM-DD");
        let checkOut = moment(newData.tgl_check_out, "YYYY-MM-DD");

        let success = true;
        let message = "";

        detailsOfPemesananModel.destroy({
          where: { id_pemesanan: idPemesanan },
        });

        if (success) {
          for (let m = checkIn; m.isBefore(checkOut); m.add(1, "days")) {
            let date = m.format("YYYY-MM-DD");
            let newDetail = {
              id_pemesanan: idPemesanan,
              id_kamar: room.id,
              tgl_akses: date,
              harga: harga,
            };
            detailsOfPemesananModel.create(newDetail).catch((error) => {
              success = false;
              message = error.message;
            });
          }
          return res.json({
            success: true,
            nomor_pemesanan: nomorPem,
            message: `Berhasil mengupdate data`,
          });
        } else {
          return res.json({
            success: false,
            message: message,
          });
        }
      })
      .catch((error) => {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      });
  }
};

exports.findPemesanan = async (req, res) => {
  try {
    const {
      id: transID,
      status_pemesanan,
      date,
      check_in: checkIn,
      nama_tamu: namaTamu,
    } = req.body;

    let conditions = [];
    if (transID) conditions.push(`pemesanans.id = '${transID}'`);
    if (status_pemesanan)
      conditions.push(`pemesanans.status_pemesanan = '${status_pemesanan}'`);
    if (date) conditions.push(`pemesanans.tgl_pemesanan = '${date}'`);
    if (checkIn) conditions.push(`pemesanans.tgl_check_in = '${checkIn}'`);
    if (namaTamu) conditions.push(`pemesanans.nama_tamu LIKE '%${namaTamu}%'`);

    let whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    let query = await sequelize.query(`
      SELECT pemesanans.id, pemesanans.nomor_pemesanan, pemesanans.nama_pemesanan, pemesanans.email_pemesanan, 
        pemesanans.tgl_pemesanan, pemesanans.tgl_check_in, pemesanans.tgl_check_out, 
        pemesanans.nama_tamu, pemesanans.jumlah_kamar, pemesanans.status_pemesanan, 
        users.nama_user, tipe_kamars.nama_tipe_kamar, tipe_kamars.harga as harga_tipe_kamar, 
        kamars.nomor_kamar 
      FROM pemesanans 
      JOIN tipe_kamars ON tipe_kamars.id = pemesanans.id_tipe_kamar 
      LEFT JOIN users ON users.id = pemesanans.id_user 
      JOIN detail_pemesanans ON detail_pemesanans.id_pemesanan = pemesanans.id 
      JOIN kamars ON kamars.id = detail_pemesanans.id_kamar 
      ${whereClause}
      GROUP BY pemesanans.id
      ORDER BY pemesanans.id DESC
    `);

    if (query[0].length === 0) {
      return res.status(400).json({
        success: false,
        message: "Data tidak ditemukan",
      });
    }

    const data = await Promise.all(
      query[0].map(async (item) => {
        const getNomorKamar = await sequelize.query(`
        SELECT kamars.nomor_kamar 
        FROM detail_pemesanans 
        JOIN pemesanans ON detail_pemesanans.id_pemesanan = pemesanans.id 
        JOIN kamars ON kamars.id = detail_pemesanans.id_kamar 
        WHERE pemesanans.id = ${item.id} 
        GROUP BY kamars.id 
        ORDER BY pemesanans.id DESC
      `);

        return {
          ...item,
          nomor_kamar: getNomorKamar[0],
        };
      }),
    );

    return res.status(200).json({
      success: true,
      data,
      message: `Berhasil menemukan data`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server",
      error: error.message,
    });
  }
};

exports.getPemesananByNomor = async (req, res) => {
  console.log("Melakukan Pencarian: ", req.params.nomor_pemesanan);
  try {
    const { nomor_pemesanan } = req.params;

    const pemesanan = await pemesananModel.findOne({
      where: { nomor_pemesanan },
      include: [
        {
          model: detailsOfPemesananModel,
          as: "details_of_pemesanan",
          include: [
            {
              model: roomModel,
              attributes: ["nomor_kamar"],
            },
          ],
        },
        {
          model: tipeModel,
          attributes: ["nama_tipe_kamar", "harga"],
        },
      ],
    });

    if (!pemesanan) {
      return res.status(404).json({
        success: false,
        message: `Pesanan dengan nomor ${nomor_pemesanan} tidak ditemukan`,
      });
    }

    return res.json({
      success: true,
      "Nama Hotel": "Sentolove Hotel",
      data: pemesanan,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: `Terjadi kesalahan pada server`,
    });
  }
};

exports.incomeToday = async (_, res) => {
  const getData = await sequelize.query(
    "SELECT SUM(uang_masuk) AS total FROM ( SELECT HARGA AS uang_masuk FROM detail_pemesanans JOIN pemesanans ON pemesanans.id = detail_pemesanans.id_pemesanan WHERE pemesanans.tgl_pemesanan = DATE(now()) GROUP BY detail_pemesanans.id_pemesanan ) AS subquery",
  );

  if (getData[0][0].total === null || getData[0][0].total === "0") {
    return res.json({
      success: false,
      message: "Data tidak ditemukan",
      data: `0`,
    });
  }
  res.json({
    success: true,
    data: getData[0][0],
    message: `Berhasil menemukan data`,
  });
};

exports.incomeThisMonth = async (req, res) => {
  const getData = await sequelize.query(
    "SELECT SUM(uang_masuk) AS total FROM (SELECT HARGA AS uang_masuk FROM detail_pemesanans JOIN pemesanans ON pemesanans.id = detail_pemesanans.id_pemesanan WHERE MONTH(pemesanans.tgl_pemesanan) = MONTH(NOW()) GROUP BY detail_pemesanans.id_pemesanan) AS subquery",
  );

  if (getData[0][0].total === null || getData[0][0].total === "0") {
    return res.json({
      success: false,
      message: "Data tidak ditemukan",
      data: `0`,
    });
  }
  res.json({
    success: true,
    data: getData[0][0],
    message: `Berhasil menemukan data`,
  });
};

exports.changeStatus = async (req, res) => {
  let status = req.body.status_pemesanan;
  let idPemesanan = req.body.idPemesanan;

  if (status !== "baru" && status !== "checkin" && status !== "checkout") {
    return res.status(400).json({
      success: false,
      message: `Status hanya boleh diisi dengan baru / checkin / checkout`,
    });
  }

  let newData = {
    status_pemesanan: status,
  };
  try {
    await pemesananModel.update(newData, { where: { id: idPemesanan } });
    let result = [];
    let query = await sequelize.query(
      `SELECT  pemesanans.id, pemesanans.nomor_pemesanan, pemesanans.nama_pemesanan,pemesanans.email_pemesanan,pemesanans.tgl_pemesanan,pemesanans.tgl_check_in,pemesanans.tgl_check_out,detail_pemesanans.harga,pemesanans.nama_tamu,pemesanans.jumlah_kamar,pemesanans.status_pemesanan, users.nama_user, tipe_kamars.nama_tipe_kamar,tipe_kamars.harga as harga_tipe_kamar, kamars.nomor_kamar FROM pemesanans JOIN tipe_kamars ON tipe_kamars.id = pemesanans.id_tipe_kamar LEFT JOIN users ON users.id=pemesanans.id_user JOIN detail_pemesanans ON detail_pemesanans.id_pemesanan=pemesanans.id JOIN kamars ON kamars.id=detail_pemesanans.id_kamar WHERE pemesanans.id=${idPemesanan} GROUP BY kamars.id ORDER BY kamars.id DESC`,
    );
    result.push(query[0]);
    let data = [];
    for (let index = 0; index < result[0].length; index++) {
      const getNomorKamar = await sequelize.query(
        `SELECT kamars.nomor_kamar FROM detail_pemesanans JOIN pemesanans ON detail_pemesanans.id_pemesanan = pemesanans.id JOIN kamars ON kamars.id = detail_pemesanans.id_kamar WHERE pemesanans.id=${result[0][index].id} GROUP BY kamars.id ORDER BY pemesanans.id DESC`,
      );
      data.push({
        id: result[0][index].id,
        nama_pemesanan: result[0][index].nama_pemesanan,
        email_pemesanan: result[0][index].email_pemesanan,
        tgl_pemesanan: result[0][index].tgl_pemesanan,
        tgl_check_in: result[0][index].tgl_check_in,
        tgl_check_out: result[0][index].tgl_check_out,
        nama_tamu: result[0][index].nama_tamu,
        jumlah_kamar: result[0][index].jumlah_kamar,
        harga: result[0][index].harga,
        status_pemesanan: result[0][index].status_pemesanan,
        nama_user: result[0][index].nama_user,
        nama_tipe_kamar: result[0][index].nama_tipe_kamar,
        nomor_kamar: getNomorKamar[0],
      });
    }
    return res.json({
      success: true,
      data: data,
      message: `Berhasil menemukan data`,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      success: false,
      message: error,
    });
  }
};

exports.getPemesananbyEmail = async (req, res) => {
  try {
    const email = req.body.email;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email tidak boleh kosong",
      });
    }

    const result = await sequelize.query(
      `SELECT pemesanans.id, pemesanans.nama_pemesanan, pemesanans.email_pemesanan, pemesanans.nomor_pemesanan, pemesanans.tgl_pemesanan, pemesanans.tgl_check_in, pemesanans.tgl_check_out, pemesanans.nama_tamu, pemesanans.jumlah_kamar, pemesanans.status_pemesanan, users.nama_user, tipe_kamars.nama_tipe_kamar, tipe_kamars.harga as harga_tipe_kamar, kamars.nomor_kamar 
      FROM pemesanans 
      JOIN tipe_kamars ON tipe_kamars.id = pemesanans.id_tipe_kamar 
      LEFT JOIN users ON users.id = pemesanans.id_user 
      JOIN detail_pemesanans ON detail_pemesanans.id_pemesanan = pemesanans.id 
      JOIN kamars ON kamars.id = detail_pemesanans.id_kamar 
      WHERE pemesanans.email_pemesanan = :email 
      GROUP BY pemesanans.id 
      ORDER BY pemesanans.id DESC`,
      {
        replacements: { email },
        type: sequelize.QueryTypes.SELECT,
      },
    );

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tidak ada transaksi yang ditemukan untuk email tersebut",
      });
    }

    const data = [];

    for (const pemesanan of result) {
      const getNomorKamar = await sequelize.query(
        `SELECT kamars.nomor_kamar 
        FROM detail_pemesanans 
        JOIN pemesanans ON detail_pemesanans.id_pemesanan = pemesanans.id 
        JOIN kamars ON kamars.id = detail_pemesanans.id_kamar 
        WHERE pemesanans.id = :pemesananId 
        GROUP BY kamars.id 
        ORDER BY pemesanans.id DESC`,
        {
          replacements: { pemesananId: pemesanan.id },
          type: sequelize.QueryTypes.SELECT,
        },
      );

      data.push({
        id: pemesanan.id,
        nama_pemesanan: pemesanan.nama_pemesanan,
        email_pemesanan: pemesanan.email_pemesanan,
        tgl_pemesanan: pemesanan.tgl_pemesanan,
        tgl_check_in: pemesanan.tgl_check_in,
        tgl_check_out: pemesanan.tgl_check_out,
        nama_tamu: pemesanan.nama_tamu,
        jumlah_kamar: pemesanan.jumlah_kamar,
        harga: pemesanan.harga_tipe_kamar,
        status_pemesanan: pemesanan.status_pemesanan,
        nama_user: pemesanan.nama_user,
        nama_tipe_kamar: pemesanan.nama_tipe_kamar,
        nomor_kamar: getNomorKamar.map((kamar) => kamar.nomor_kamar),
      });
    }

    return res.json({
      success: true,
      data: data,
      message: "Data transaksi berhasil dimuat",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server",
    });
  }
};
