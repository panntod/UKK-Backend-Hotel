const express = require("express");

const app = express();

app.use(express.json());

const pemesananController = require("../controller/pemesanan_controller");
const auth = require(`../middleware/auth`);
const { checkRole } = require("../middleware/checkRole");

app.get(
  "/getAll",
  auth.authVerify,
  checkRole(["admin", "resepsionis"]),
  pemesananController.getAllPemesanan,
);
app.post(
  "/manual",
  auth.authVerify,
  checkRole(["admin", "resepsionis"]),
  pemesananController.addPemesananManual,
);
app.put(
  "/:id",
  auth.authVerify,
  checkRole(["admin", "resepsionis"]),
  pemesananController.updatePemesanan,
);
app.get(
  "/month",
  auth.authVerify,
  checkRole(["admin", "resepsionis"]),
  pemesananController.incomeThisMonth,
);
app.get(
  "/today",
  auth.authVerify,
  checkRole(["admin", "resepsionis"]),
  pemesananController.incomeToday,
);
app.post(
  "/changeStatus",
  auth.authVerify,
  checkRole(["resepsionis"]),
  pemesananController.changeStatus,
);
app.post(
  "/doubleRoom",
  auth.authVerify,
  checkRole(["admin", "resepsionis", "customer"]),
  pemesananController.addDoublePemesanan,
);
app.post(
  "/doubleRoomManual",
  auth.authVerify,
  checkRole(["admin", "resepsionis", "customer"]),
  pemesananController.addDoublePemesananManual,
);

app.post("/", auth.authVerify, pemesananController.addPemesanan);
app.get("/nomor/:nomor_pemesanan", pemesananController.getPemesananByNomor);
app.post("/findByEmail", pemesananController.getPemesananbyEmail);
app.post("/findOne", pemesananController.findPemesanan);

module.exports = app;
