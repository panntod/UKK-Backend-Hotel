const multer = require(`multer`);
const path = require(`path`);
const fs = require(`fs`);

const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    const dir = "./public/foto_user";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    cb(null, path.join(__dirname, `../public/foto_user`), function (err, _) {
      if (err) {
        throw err;
      }
    });
  },

  filename: (_, file, cb) => {
    let newFilename = `images-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, newFilename);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const acceptedType = [`image/jpg`, `image/jpeg`, `image/png`];
    if (!acceptedType.includes(file.mimetype)) {
      cb(null, false);
      return cb(`Format File (${file.mimetype}) Tidak didukung`);
    }

    const filesize = req.headers[`content-length`];
    const maxSize = 1 * 1024 * 1024;
    if (filesize > maxSize) {
      cb(null, false);
      return cb(`File terlalu besar`);
    }
    cb(null, true);
  },
});

module.exports = upload;
