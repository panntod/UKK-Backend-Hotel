const { sequelize } = require("./config/database");
const path = require("path");
const PORT = 8000;
const moment = require("moment");
const express = require(`express`);
const cors = require(`cors`);
const bodyParser = require("body-parser");

const app = express();

app.use(cors({ credentials: true, origin: true, allowedHeaders: "*" }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const userRoute = require(`./routes/user_routes`);
const tipeRoute = require(`./routes/tipe_kamar_routes`);
const roomRoute = require(`./routes/kamar_routes`);
const pemesananRoute = require(`./routes/pemesanan_routes`);

app.use(`/tipe`, tipeRoute);
app.use(`/user`, userRoute);
app.use(`/kamar`, roomRoute);
app.use(`/pemesanan`, pemesananRoute);
app.use("/public", express.static(path.join(__dirname, "public")));
app.use("*", (req, res) => {
  res.status(404).json({ success: false, message: "Api tidak ditemukan" });
});

async function checkAndUpdateStatus() {
  let now = moment().format("YYYY-MM-DD");

  try {
    const updateIn = `UPDATE pemesanans SET status_pemesanan = "checkin" WHERE tgl_check_in = '${now}' RETURNING nomor_kamar`;
    const resultsIn = await sequelize.query(updateIn, {
      type: sequelize.QueryTypes.UPDATE,
    });

    if (resultsIn[1] > 0) {
      resultsIn[0].forEach((kamar) => {
        console.log(
          `Berhasil update status checkin. Nomor kamar: ${kamar.nomor_kamar}`,
        );
      });
    } else {
      console.log("Tidak ada kamar yang di-checkin.");
    }
  } catch (error) {
    console.error(`Error updating check-in status: ${error.message}`);
  }

  try {
    const updateOut = `UPDATE pemesanans SET status_pemesanan = "checkout" WHERE tgl_check_out = '${now}' RETURNING nomor_kamar`;
    const resultsOut = await sequelize.query(updateOut, {
      type: sequelize.QueryTypes.UPDATE,
    });

    if (resultsOut[1] > 0) {
      resultsOut[0].forEach((kamar) => {
        console.log(
          `Berhasil update status checkout. Nomor kamar: ${kamar.nomor_kamar}`,
        );
      });
    } else {
      console.log("Tidak ada kamar yang di-checkout.");
    }
  } catch (error) {
    console.error(`Error updating check-out status: ${error.message}`);
  }
}

const now = moment().tz("Asia/Jakarta");
const timeString = now.format("h:mm A");

if (timeString === "12:00 PM") {
  setInterval(checkAndUpdateStatus, 20000);
}

app.listen(PORT, () => {
  console.log(`🚀 Server runs on http://localhost:${PORT}`);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error.message);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled Rejection:", error.message);
});
