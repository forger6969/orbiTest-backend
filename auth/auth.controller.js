// auth/auth.controller.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { User } = require("../user/user.model");
const { bot } = require("../telegrambot/bot");
const Group = require("../groups/group.model");
const {
  sendEmail,
  registrationEmailTemplate,
} = require("../utils/EmailSender");
const { sendToMentor } = require("../socket/notify");
const { userZodSchema, loginZodSchema } = require("./userZodSchema");

const registerUser = async (req, res) => {
  try {
    const validation = userZodSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: validation.error.errors[0].message,
      });
    }

    const { username, email, password, groupID, firstName, lastName } =
      req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    let group = null;
    if (groupID) {
      group = await Group.findById(groupID);
      if (!group) {
        return res
          .status(404)
          .json({ success: false, message: "Bunday guruh yoq" });
      }

      group = group;
    }

    const newUser = new User({
      username,
      firstName,
      lastName,
      email,
      password: hashedPassword,
      groupID: groupID || null,
      mentor: group ? group.mentor : null,
      isProfileComplete: true, // ✅ Обычная регистрация сразу полная
    });

    if (newUser.mentor) {
      await sendToMentor(newUser.mentor, {
        title: "В вашей группе новый Студент!",
        text: `Студент ${newUser.firstName} ${newUser.lastName} добавлен в группу ${group.groupName}`,
        notifyType: "newStudent",
        student: newUser,
        additionalData: {
          studentName: `${newUser.firstName} ${newUser.lastName}`,
        },
      });
    }

    await newUser.save();

    await sendEmail({
      toEmail: newUser.email,
      subject: "Уведомление о регистрации",
      htmlContent: registrationEmailTemplate({
        firstName: newUser.firstName,
        lastName: newUser.lastName,
      }),
    });

    if (groupID && group) {
      group.students.addToSet(newUser._id);
      await group.save();

      if (group.telegramId) {
        await bot.sendMessage(
          group.telegramId,
          `В вашей группе новый участник!\nИмя: ${newUser.username}\nEmail: ${newUser.email}`,
          { parse_mode: "Markdown" }
        );
      }
    }

    res.json({ success: true, message: "User registered", newUser });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message + ` [NAME] ${err.name}`,
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const validation = loginZodSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: validation.error.errors[0].message,
      });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: "This account uses Google Sign-In. Please login with Google.",
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
      isProfileComplete: user.isProfileComplete,
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

// ✅ Google OAuth Callback
const googleAuthCallback = async (req, res) => {
  try {
    const user = req.user;

    console.log("📝 Google callback for user:", {
      email: user.email,
      isProfileComplete: user.isProfileComplete,
      hasGroup: !!user.groupID,
    });

    const payload = {
      id: user._id,
      role: user.role,
      isProfileComplete: user.isProfileComplete,
    };

    const secret =
      user.role === "admin"
        ? process.env.JWT_SECRET_ADMIN
        : process.env.JWT_SECRET;

    const expiresIn = user.role === "admin" ? "12h" : "6h";
    const token = jwt.sign(payload, secret, { expiresIn });

    const frontendURL = process.env.FRONTEND_URL || "http://localhost:5173";

    // ✅ Передаем все необходимые параметры
    res.redirect(
      `${frontendURL}/auth/google-success?token=${token}&isProfileComplete=${user.isProfileComplete}&id=${user._id}`
    );
  } catch (err) {
    console.error("❌ Google callback error:", err);
    const frontendURL = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(
      `${frontendURL}/auth/error?message=${encodeURIComponent(err.message)}`
    );
  }
};

// ✅ Завершение профиля после Google OAuth
const completeProfile = async (req, res) => {
  try {
    const { userId, groupID, username } = req.body;

    console.log("📝 Complete profile request:", { userId, groupID, username });

    if (!userId || !groupID) {
      return res.status(400).json({
        success: false,
        message: "User ID and Group ID are required",
      });
    }

    // Проверяем существование группы
    const group = await Group.findById(groupID);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // Находим пользователя
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Проверяем, не завершен ли уже профиль
    if (user.isProfileComplete) {
      return res.status(400).json({
        success: false,
        message: "Profile already completed",
      });
    }

    // Обновляем username если передан и отличается
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser && existingUser._id.toString() !== userId) {
        return res.status(400).json({
          success: false,
          message: "Username already taken",
        });
      }
      user.username = username;
    }

    // Обновляем профиль пользователя
    user.groupID = groupID;
    user.mentor = group.mentor;
    user.isProfileComplete = true; // ✅ Профиль завершен

    await user.save();

    // Добавляем студента в группу (используем addToSet для надежности)
    group.students.addToSet(user._id);
    await group.save();

    // Отправляем email
    await sendEmail({
      toEmail: user.email,
      subject: "Регистрация завершена",
      htmlContent: registrationEmailTemplate({
        firstName: user.firstName,
        lastName: user.lastName,
      }),
    });

    // Уведомление в Telegram
    if (group.telegramId) {
      await bot.sendMessage(
        group.telegramId,
        `В вашей группе новый участник!\nИмя: ${user.firstName} ${user.lastName}\nEmail: ${user.email}`,
        { parse_mode: "Markdown" }
      );
    }

    // Создаем новый JWT токен с обновленными данными
    const payload = {
      id: user._id,
      role: user.role,
      isProfileComplete: true,
    };

    const secret =
      user.role === "admin"
        ? process.env.JWT_SECRET_ADMIN
        : process.env.JWT_SECRET;

    const expiresIn = user.role === "admin" ? "12h" : "6h";
    const token = jwt.sign(payload, secret, { expiresIn });

    const userData = user.toObject();
    delete userData.password;

    console.log("✅ Profile completed successfully for:", user.email);

    res.json({
      success: true,
      message: "Profile completed successfully",
      token,
      user: userData,
    });
  } catch (err) {
    console.error("❌ Complete profile error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  googleAuthCallback,
  completeProfile,
};
