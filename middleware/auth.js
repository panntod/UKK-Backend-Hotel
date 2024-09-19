const jsonwebtoken = require("jsonwebtoken");

const authVerify = async (req, res, next) => {
  try {
    const token =
      req.headers.authorization && req.headers.authorization.split(" ")[1];
    const SECRET_KEY = "secretcode";

    let decodedToken;
    try {
      decodedToken = jsonwebtoken.verify(token, SECRET_KEY);
    } catch (error) {
      if (error instanceof jsonwebtoken.TokenExpiredError) {
        return res.status(400).json({
          message: "Token sudah kadaluarsa",
          err: error,
        });
      }
      return res.status(400).json({
        message: "Token tidak cocok",
        err: error,
      });
    }

    req.userData = decodedToken;
    next();
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      message: error,
    });
  }
};

module.exports = { authVerify };
