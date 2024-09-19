const express = require("express");

const app = express();

app.use(express.json());

const roomController = require("../controller/kamar_controller");
const auth = require(`../middleware/auth`);
const { checkRole } = require("../middleware/checkRole");

app.get(
  "/getAll",
  auth.authVerify,
  checkRole(["admin", "resepsionis"]),
  roomController.getAllRoom,
);
app.post("/findByDate", auth.authVerify, roomController.availableRoom);
app.get(
  "/checkAvailable/:tgl_akses",
  auth.authVerify,
  checkRole(["admin", "resepsionis"]),
  roomController.availableRoomSingleDate,
);
app.get(
  "/findOne/:nomor_kamar",
  auth.authVerify,
  checkRole(["admin", "resepsionis"]),
  roomController.findRoom,
);
app.get(
  "/findOneById/:id",
  auth.authVerify,
  checkRole(["admin", "resepsionis"]),
  roomController.findRoomById,
);
app.delete(
  "/:id",
  auth.authVerify,
  checkRole(["admin"]),
  roomController.deleteRoom,
);
app.put(
  "/:id",
  auth.authVerify,
  checkRole(["admin"]),
  roomController.updateRoom,
);

app.get("/getRoomCount", roomController.getRoomLength);
app.post("/findByType", roomController.availableRoomWithType);
app.post("/", auth.authVerify, checkRole(["admin"]), roomController.addRoom);

module.exports = app;
