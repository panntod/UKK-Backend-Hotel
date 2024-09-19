const express = require("express");
const app = express();

app.use(express.json());

const userController = require("../controller/user_controller");
const auth = require(`../middleware/auth`);
const { checkRole } = require("../middleware/checkRole");

app.get(
  "/getAll",
  auth.authVerify,
  checkRole(["admin", "resepsionis"]),
  userController.getAllUser,
);
app.get(
  "/findOne/:id",
  auth.authVerify,
  checkRole(["admin", "resepsionis"]),
  userController.findUser,
);
app.delete(
  "/:id",
  auth.authVerify,
  checkRole(["admin"]),
  userController.deleteUser,
);
app.get(
  "/getAllExcCustomer",
  auth.authVerify,
  checkRole(["admin", "resepsionis"]),
  userController.findAllExcCustomer,
);
app.get(
  "/getAllCustomer",
  auth.authVerify,
  checkRole(["admin", "resepsionis"]),
  userController.findAllCustomer,
);

app.post("/login", userController.login);
app.put("/:id", userController.updateUser);
app.post("/register", userController.addUser);
app.post("/registerCustomer", userController.RegisterCustomer);
app.get("/userCount", userController.getUserLength);

module.exports = app;
