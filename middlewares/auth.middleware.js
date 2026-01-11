const jwt = require("jsonwebtoken");

const tokenMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "Token is required" });
    }

    let decoded;

    // сначала пробуем проверить как админ
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_ADMIN);
      req.user = { id: decoded.id || decoded._id, admin: true };
      return next();
    } catch {
      // если не админ, проверяем как обычный пользователь
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: decoded.id || decoded._id, admin: false };
      return next();
    }
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};


const adminMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "token is required" });
    }

    const decoded = await jwt.verify(token, process.env.JWT_SECRET_ADMIN);
    req.user = { id: decoded._id, admin: true };
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: "Invalid token" });
  }
};

module.exports = { tokenMiddleware, adminMiddleware };
