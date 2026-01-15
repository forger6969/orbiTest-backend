const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { User } = require("../user/user.model");

const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: "add all keys!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ username, email, password: hashedPassword});
    await newUser.save();

    res.json({ success: true, message: "User registered", newUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const payload = {
      id: user._id,
      role: user.role,
    };

    const secret =
      user.role === "admin"
        ? process.env.JWT_SECRET_ADMIN
        : process.env.JWT_SECRET;

    const expiresIn = user.role === "admin" ? "12h" : "6h";

    const token = jwt.sign(payload, secret, { expiresIn });

    const userData = user.toObject();
    delete userData.password;

    res.status(200).json({
      success: true,
      token,
      user: userData,
      message: user.role === "admin" ? "Hello admin" : "Login successful",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
};
