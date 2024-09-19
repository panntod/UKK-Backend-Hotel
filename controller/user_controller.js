const express = require("express");
const app = express();

const md5 = require("md5");

const userModel = require(`../models/index`).user;
const Op = require(`sequelize`).Op;

const path = require(`path`);
const fs = require(`fs`);

const upload = require(`./upload_foto_user`).single(`foto`);

const jsonwebtoken = require("jsonwebtoken");
const SECRET_KEY = "secretcode";

exports.login = async (req, res) => {
  try {
    const params = {
      email: req.body.email,
      password: md5(req.body.password),
    };

    const findUser = await userModel.findOne({ where: params });
    if (findUser == null) {
      return res.status(400).json({
        message: "Kesalahan pada email atau password",
      });
    }
    let tokenPayLoad = {
      id_user: findUser.id,
      email: findUser.email,
      role: findUser.role,
      nama_user: findUser.nama_user,
    };
    tokenPayLoad = JSON.stringify(tokenPayLoad);
    let token = jsonwebtoken.sign(tokenPayLoad, SECRET_KEY);

    return res.status(200).json({
      message: "Success login",
      data: {
        token: token,
        id_user: findUser.id_user,
        nama_user: findUser.nama_user,
        email: findUser.email,
        role: findUser.role,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      message: error,
    });
  }
};

exports.getAllUser = async (req, res) => {
  let user = await userModel.findAll();
  if (user.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Data tidak ditemukan",
    });
  } else {
    return res.json({
      success: true,
      data: user,
      message: `Berhasil menemukan data`,
    });
  }
};

exports.findUser = async (req, res) => {
  let id = req.params.id;
  if (!id) {
    return res.status.json({
      success: false,
      message: "Masukan user id",
    });
  } else {
    let user = await userModel.findOne({
      where: {
        [Op.and]: [{ id: id }],
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Data tidak ditemukan",
      });
    } else {
      return res.json({
        success: true,
        data: user,
        message: `Berhasil menemukan data`,
      });
    }
  }
};

exports.addUser = (req, res) => {
  upload(req, res, async (error) => {
    if (error) {
      return res.status(400).json({ message: error });
    }
    if (!req.file) {
      return res.status(400).json({
        message: `harap mengupload foto dan pastikan semua sudah terisi`,
      });
    }

    let newUser = {
      nama_user: req.body.nama_user,
      foto: req.file.filename,
      email: req.body.email,
      password: md5(req.body.password),
      role: req.body.role,
    };

    let user = await userModel.findAll({
      where: {
        [Op.or]: [{ nama_user: newUser.nama_user }, { email: newUser.email }],
      },
    });

    if (
      newUser.nama_user === "" ||
      newUser.email === "" ||
      newUser.password === "" ||
      newUser.role === ""
    ) {
      const oldFotoUser = newUser.foto;
      const patchFoto = path.join(
        __dirname,
        `../public/foto_user`,
        oldFotoUser,
      );
      if (fs.existsSync(patchFoto)) {
        fs.unlink(patchFoto, (error) => console.log(error));
      }

      return res.status(400).json({
        success: false,
        message: "Harus diisi semua",
      });
    } else {
      if (user.length > 0) {
        const oldFotoUser = newUser.foto;
        const patchFoto = path.join(
          __dirname,
          `../public/foto_user`,
          oldFotoUser,
        );
        if (fs.existsSync(patchFoto)) {
          fs.unlink(patchFoto, (error) => console.log(error));
        }
        return res.status(400).json({
          success: false,
          message: "Nama atau Email sudah terpakai",
        });
      } else {
        console.log(newUser);
        userModel
          .create(newUser)
          .then((result) => {
            return res.json({
              success: true,
              data: result,
              message: "Berhasil menambahkan data",
            });
          })
          .catch((error) => {
            return res.status(400).json({
              success: false,
              message: error.message,
            });
          });
      }
    }
  });
};

exports.updateUser = (req, res) => {
  upload(req, res, async (error) => {
    if (error) {
      return res.status(400).json({ message: error });
    }

    let idUser = req.params.id;

    let getId = await userModel.findAll({
      where: {
        [Op.and]: [{ id: idUser }],
      },
    });

    if (getId.length === 0) {
      return res.status(400).json({
        success: false,
        message: "User dengan id tersebut tidak ada",
      });
    }

    let dataUser = {
      nama_user: req.body.nama_user,
      email: req.body.email,
      password: md5(req.body.password),
      role: req.body.role,
      foto: getId.foto,
    };

    if (req.file) {
      const selectedUser = await userModel.findOne({
        where: { id: idUser },
      });

      const oldFotoUser = selectedUser.foto;

      const patchFoto = path.join(
        __dirname,
        `../public/foto_user`,
        oldFotoUser,
      );

      if (fs.existsSync(patchFoto)) {
        fs.unlink(patchFoto, (error) => console.log(error));
      }

      dataUser.foto = req.file.filename;
    }

    if (
      dataUser.nama_user === "" ||
      dataUser.email === "" ||
      dataUser.password === "" ||
      dataUser.role === ""
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Harus diisi semua kalau tidak ingin merubah isi dengan value sebelumnya",
      });
    }

    let user = await userModel.findAll({
      where: {
        [Op.and]: [
          { id: { [Op.ne]: idUser } },
          {
            [Op.or]: [
              { nama_user: dataUser.nama_user },
              { email: dataUser.email },
            ],
          },
        ],
      },
    });

    if (user.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Nama atau Email sudah terpakai",
      });
    }

    userModel
      .update(dataUser, { where: { id: idUser } })
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
  });
};

exports.deleteUser = async (req, res) => {
  let idUser = req.params.id;

  let getId = await userModel.findAll({
    where: {
      [Op.and]: [{ id: idUser }],
    },
  });

  if (getId.length === 0) {
    return res.status(400).json({
      success: false,
      message: "User dengan id tersebut tidak ada",
    });
  }

  const user = await userModel.findOne({ where: { id: idUser } });

  const oldFotoUser = user.foto;

  const patchFoto = path.join(__dirname, `../public/foto_user`, oldFotoUser);

  if (fs.existsSync(patchFoto)) {
    fs.unlink(patchFoto, (error) => console.log(error));
  }

  userModel
    .destroy({ where: { id: idUser } })

    .then((result) => {
      return res.json({
        success: true,
        message: "Berhasil menghapus data",
      });
    })
    .catch((error) => {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    });
};

exports.findAllCustomer = async (req, res) => {
  let user = await userModel.findAll({ where: { role: "customer" } });
  if (user.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Data tidak ditemukan",
    });
  } else {
    return res.json({
      success: true,
      data: user,
      message: `Berhasil mendapatkan data`,
    });
  }
};

exports.findAllExcCustomer = async (req, res) => {
  let user = await userModel.findAll({
    where: {
      [Op.not]: [{ role: "customer" }],
    },
  });
  if (user.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Data tidak ditemukan",
    });
  } else {
    return res.json({
      success: true,
      data: user,
      message: `Berhasil mendapatkan data`,
    });
  }
};

exports.RegisterCustomer = (req, res) => {
  upload(req, res, async (error) => {
    if (error) {
      return res.status(400).json({ message: error });
    }
    if (!req.file) {
      return res.status(400).json({
        message: `Harap mengupload foto dan pastikan semua sudah terisi`,
      });
    }

    let newUser = {
      nama_user: req.body.nama_user,
      foto: req.file.filename,
      email: req.body.email,
      password: md5(req.body.password),
      role: "customer",
    };

    let user = await userModel.findAll({
      where: {
        [Op.or]: [{ nama_user: newUser.nama_user }, { email: newUser.email }],
      },
    });

    if (
      newUser.nama_user === "" ||
      newUser.email === "" ||
      newUser.password === ""
    ) {
      const oldFotoUser = newUser.foto;
      const patchFoto = path.join(
        __dirname,
        `../public/foto_user`,
        oldFotoUser,
      );
      if (fs.existsSync(patchFoto)) {
        fs.unlink(patchFoto, (error) => console.log(error));
      }

      return res.status(400).json({
        success: false,
        message: "Harus diisi semua",
      });
    } else {
      if (user.length > 0) {
        const oldFotoUser = newUser.foto;
        const patchFoto = path.join(
          __dirname,
          `../public/foto_user`,
          oldFotoUser,
        );
        if (fs.existsSync(patchFoto)) {
          fs.unlink(patchFoto, (error) => console.log(error));
        }
        return res.status(400).json({
          success: false,
          message: "Nama atau Email sudah terpakai",
        });
      } else {
        console.log(newUser);
        userModel
          .create(newUser)
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
    }
  });
};

exports.getUserLength = async (req, res) => {
  try {
    let userExc = await userModel.count({
      where: {
        [Op.not]: [{ role: "customer" }],
      },
    });
    let userCus = await userModel.count({
      where: {
        [Op.and]: [{ role: "customer" }],
      },
    });
    return res.json({
      status: true,
      userExc,
      userCus,
    });
  } catch (error) {
    return res.json({
      status: false,
      message: error,
    });
  }
};
