const { tipe_kamar: tipeModel } = require(`../models/index`);
const Op = require(`sequelize`).Op;

const path = require(`path`);
const fs = require(`fs`);
const moment = require(`moment`);

const upload = require(`./upload_foto_tipe`).single(`foto`);

exports.getAllType = async (req, res) => {
  let tipe = await tipeModel.findAll();
  if (tipe.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Data tidak ditemukan",
    });
  }
  return res.json({
    success: true,
    data: tipe,
    message: `Berhasil mendapatkan data`,
  });
};

exports.findType = async (req, res) => {
  let nama_tipe_kamar = req.body.nama_tipe_kamar;

  let tipe = await tipeModel.findOne({
    where: {
      [Op.and]: [{ nama_tipe_kamar: nama_tipe_kamar }],
    },
  });
  if (!tipe) {
    return res.json({
      success: false,
      message: "Data tidak ditemukan",
    });
  }

  return res.json({
    success: true,
    data: tipe,
    message: `Tipe Room have been loaded`,
  });
};

exports.findTypeById = async (req, res) => {
  let id = req.params.idTipe;

  let tipe = await tipeModel.findOne({
    where: {
      id: id,
    },
  });

  if (!tipe) {
    return res.status(400).json({
      success: false,
      message: "Data tidak ditemukan",
    });
  }

  return res.json({
    success: true,
    data: tipe,
    message: `Berhasil mendapatkan data`,
  });
};

exports.addType = (req, res) => {
  upload(req, res, async (error) => {
    if (error) {
      return res.status(400).json({ message: error });
    }

    if (!req.file) {
      return res.status(400).json({ message: `Foto tidak ditemukan` });
    }

    console.log("Ini adalah foto: ", req.file);

    let newType = {
      nama_tipe_kamar: req.body.nama_tipe_kamar,
      harga: req.body.harga,
      deskripsi: req.body.deskripsi,
      foto: req.file.filename,
    };

    if (
      newType.nama_tipe_kamar === "" ||
      newType.harga === "" ||
      newType.deskripsi === ""
    ) {
      const pathFoto = path.join(
        nama,
        `../public/foto_tipe_kamar`,
        newType.foto,
      );
      if (fs.existsSync(pathFoto)) {
        fs.unlink(pathFoto, (error) => console.log(error));
      }
      return res.status(400).json({
        success: true,
        message: "Data harus dipenuhi semua",
      });
    }

    let tipe = await tipeModel.findAll({
      where: {
        [Op.and]: [{ nama_tipe_kamar: newType.nama_tipe_kamar }],
      },
    });

    if (tipe.length > 0) {
      const pathFoto = path.join(
        nama,
        `../public/foto_tipe_kamar`,
        newType.foto,
      );
      if (fs.existsSync(pathFoto)) {
        fs.unlink(pathFoto, (error) => console.log(error));
      }
      return res.status(400).json({
        success: false,
        message: "Nama tipe kamar yang anda inputkan sudah ada",
      });
    }
    tipeModel
      .create(newType)
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
  });
};

exports.updateType = (req, res) => {
  upload(req, res, async (error) => {
    if (error) {
      return res.status(400).json({ message: error });
    }

    const idType = req.params.id;

    try {
      const selectedType = await tipeModel.findOne({ where: { id: idType } });

      if (!selectedType) {
        return res.status(404).json({
          success: false,
          message: "Tipe dengan id tersebut tidak ditemukan",
        });
      }

      const dataType = {
        nama_tipe_kamar: req.body.nama_tipe_kamar,
        harga: req.body.harga,
        deskripsi: req.body.deskripsi,
      };

      if (req.file) {
        if (selectedType.foto) {
          const pathFoto = path.join(
            __dirname,
            "../public/foto_tipe_kamar",
            selectedType.foto,
          );

          if (fs.existsSync(pathFoto)) {
            fs.unlink(pathFoto, (err) => {
              if (err) console.error(err);
            });
          }
        }
        dataType.foto = req.file.filename;
      }

      if (!dataType.nama_tipe_kamar || !dataType.harga || !dataType.deskripsi) {
        return res.status(400).json({
          success: false,
          message:
            "Harus diisi semua kalau tidak ingin merubah, isi dengan value sebelumnya",
        });
      }

      const existingTypes = await tipeModel.findAll({
        where: {
          [Op.and]: [
            { id: { [Op.ne]: idType } },
            { nama_tipe_kamar: dataType.nama_tipe_kamar },
          ],
        },
        attributes: ["id", "nama_tipe_kamar", "harga", "deskripsi", "foto"],
      });

      if (existingTypes.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Tipe Kamar yang anda inputkan sudah ada`,
        });
      }

      await tipeModel.update(dataType, { where: { id: idType } });

      return res.json({
        success: true,
        message: `Berhasil mengupdate data`,
      });
    } catch (error) {
      console.error(error);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  });
};

exports.deleteType = async (req, res) => {
  let idType = req.params.id;

  let selectedType = await tipeModel.findAll({
    where: {
      [Op.and]: [{ id: idType }],
    },
  });

  if (!selectedType) {
    return res.status(400).json({
      success: false,
      message: "Tipe dengan id tersebut tidak ditemukan",
    });
  }

  const tipe = await tipeModel.findOne({ where: { id: idType } });

  const oldFotoUser = tipe.foto;

  const pathFoto = path.join(nama, `../public/foto_tipe_kamar`, oldFotoUser);

  if (fs.existsSync(pathFoto)) {
    fs.unlink(pathFoto, (error) => console.log(error));
  }

  tipeModel
    .destroy({ where: { id: idType } })
    .then((_) => {
      return res.json({
        success: true,
        message: `Berhasil menghapus data`,
      });
    })
    .catch((error) => {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    });
};

exports.getTypeLength = async (req, res) => {
  try {
    let tipe = await tipeModel.count();
    return res.json({
      success: true,
      jumlah_tipe: tipe,
    });
  } catch (error) {
    console.log(error);
    return res.json({
      success: false,
      message: error,
    });
  }
};
