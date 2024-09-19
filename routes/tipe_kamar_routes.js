const express = require("express");
const app = express();

app.use(express.json());

const tipeController = require("../controller/tipe_kamar_controller");
const auth = require(`../middleware/auth`);
const { checkRole } = require("../middleware/checkRole");

app.get(
  "/findOneById/:idTipe",
  auth.authVerify,
  checkRole(["admin", "resepsionis"]),
  tipeController.findTypeById,
);
app.delete(
  "/:id",
  auth.authVerify,
  checkRole(["admin"]),
  tipeController.deleteType,
);
app.put(
  "/:id",
  auth.authVerify,
  checkRole(["admin"]),
  tipeController.updateType,
);

app.get("/getAll", tipeController.getAllType);
app.post("/", auth.authVerify, checkRole(["admin"]), tipeController.addType);
app.post("/findByName", tipeController.findType);
app.get("/getTypeCount", tipeController.getTypeLength);

module.exports = app;
