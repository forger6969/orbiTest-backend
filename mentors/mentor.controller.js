const Mentor = require("./mentor.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Group = require("../groups/group.model");
const { User } = require("../user/user.model");
const Exam = require("../exams/exam.model");
const {
  getMentorNotifications,
  sendToAllMentors,
} = require("../socket/notify");
const MentorNotify = require("../notification/mentorNotify.model");
const {
  sendEmail,
  registrationEmailTemplate,
} = require("../utils/EmailSender");

const createMentor = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      grade,
      bio,
      skills,
      yearsExperience,
    } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Заполните обязательные поля" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newMentor = new Mentor({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      grade: grade ? grade : "junior",
      bio: bio ? bio : null,
      skills: skills && skills,
    });

    await newMentor.save();

    await sendEmail({
      toEmail: newMentor.email,
      subject: "Уведомление о регистрации",
      htmlContent: registrationEmailTemplate({
        firstName: newMentor.firstName,
        lastName: newMentor.lastName,
      }),
    });

    res.json({ success: true, newMentor });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const loginMentor = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "email и пароль обязательные" });
    }

    const findUser = await Mentor.findOne({ email }).select("+password");

    if (!findUser) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, findUser.password);

    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Ivalid email or password" });
    }

    const token = await jwt.sign(
      { id: findUser._id },
      process.env.JWT_SECRET_MENTOR,
      { expiresIn: "24h" }
    );

    console.log(token);

    res.json({ success: true, token });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const googleMentorCallback = async (req, res) => {
  try {
    const mentor = req.user.mentor;

    if (!mentor) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/mentor/login?error=auth_failed`
      );
    }

    // Генерируем JWT токен для ментора
    const token = jwt.sign({ id: mentor._id }, process.env.JWT_SECRET_MENTOR, {
      expiresIn: "24h",
    });

    console.log("✅ Google Mentor Login Success:", mentor.email);

    // Редирект на фронтенд с токеном
    res.redirect(
      `${process.env.FRONTEND_URL}/mentor/auth/callback?token=${token}`
    );
  } catch (err) {
    console.error("❌ Google Mentor Callback Error:", err);
    res.redirect(`${process.env.FRONTEND_URL}/mentor/login?error=server_error`);
  }
};

const getMe = async (req, res) => {
  try {
    const { id } = req.user;

    const user = await Mentor.findById(id);

    res.json({ id, user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const getMyGroup = async (req, res) => {
  try {
    const { id } = req.user;

    const groups = await Group.find({ mentor: id });
    res.json({ success: true, groups });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const createGroupWithMentor = async (req, res) => {
  try {
    const { groupName, groupDescribe, groupDay, groupTime } = req.body;
    const { id } = req.user;

    if (!groupName || !groupDescribe || !groupDay || !groupTime) {
      return res
        .status(400)
        .json({ success: false, message: "add required fields!" });
    }

    const group = new Group({
      groupName,
      groupDescribe,
      groupDay,
      groupTime,
      mentor: id,
    });

    await group.save();
    const mentor = await Mentor.findById(id);

    await sendToAllMentors({
      title: `Yangi guruh yaraldi!`,
      text: `Mentor: ${mentor.firstName} ${mentor.lastName} ${group.groupName} nomli guruh yaratdi!`,
    });

    res.json({ success: true, group });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const getMyStudents = async (req, res) => {
  try {
    const { id } = req.user;
    const students = await User.find({ mentor: id });

    res.json({ success: true, students });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const getDashboard = async (req, res) => {
  try {
    const { id } = req.user;

    const mentor = await Mentor.findById(id);
    const groups = await Group.find({ mentor: id }).populate("mentor");
    const students = await User.find({ mentor: id }).populate("groupID");
    const exams = await Exam.find().populate({
      path: "group",
      match: { mentor: id },
    });

    res.json({ mentor, groups, students, exams });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const mentorNotifications = async (req, res) => {
  try {
    const notifications = await getMentorNotifications(req.user.id);
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteNotify = async (req, res) => {
  try {
    await MentorNotify.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const verificationCodes = new Map();

// Генерация случайного 6-значного кода
const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Обновление базовой информации профиля (без email и пароля)
const updateProfile = async (req, res) => {
  try {
    const { id } = req.user;
    const { firstName, lastName, bio, grade, skills, yearsExperience, avatar } =
      req.body;

    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (bio !== undefined) updateData.bio = bio;
    if (grade) updateData.grade = grade;
    if (skills) updateData.skills = skills;
    if (yearsExperience !== undefined)
      updateData.yearsExperience = yearsExperience;
    if (avatar !== undefined) updateData.avatar = avatar;

    const mentor = await Mentor.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!mentor) {
      return res
        .status(404)
        .json({ success: false, message: "Ментор не найден" });
    }

    res.json({ success: true, mentor });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Запрос на смену email - отправка кодов на текущую и новую почту
const requestEmailChange = async (req, res) => {
  try {
    const { id } = req.user;
    const { newEmail } = req.body;

    if (!newEmail) {
      return res
        .status(400)
        .json({ success: false, message: "Укажите новый email" });
    }

    // Проверка формата email
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(newEmail)) {
      return res
        .status(400)
        .json({ success: false, message: "Некорректный формат email" });
    }

    const mentor = await Mentor.findById(id);
    if (!mentor) {
      return res
        .status(404)
        .json({ success: false, message: "Ментор не найден" });
    }

    // Проверка, не занят ли новый email
    const existingMentor = await Mentor.findOne({ email: newEmail });
    if (existingMentor) {
      return res
        .status(400)
        .json({ success: false, message: "Этот email уже используется" });
    }

    // Генерация кодов для текущей и новой почты
    const currentEmailCode = generateCode();
    const newEmailCode = generateCode();

    // Сохранение кодов с временем истечения (10 минут)
    const expirationTime = Date.now() + 10 * 60 * 1000;
    verificationCodes.set(`email_change_current_${id}`, {
      code: currentEmailCode,
      email: mentor.email,
      newEmail: newEmail,
      expires: expirationTime,
    });
    verificationCodes.set(`email_change_new_${id}`, {
      code: newEmailCode,
      email: newEmail,
      expires: expirationTime,
    });

    // Отправка кода на текущую почту
    await sendEmail({
      toEmail: mentor.email,
      subject: "Подтверждение смены email",
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Подтверждение смены email</h2>
          <p>Здравствуйте, ${mentor.firstName} ${mentor.lastName}!</p>
          <p>Вы запросили смену email на новый адрес: <strong>${newEmail}</strong></p>
          <p>Ваш код подтверждения для текущей почты:</p>
          <h1 style="color: #4CAF50; text-align: center; font-size: 36px;">${currentEmailCode}</h1>
          <p>Код действителен в течение 10 минут.</p>
          <p>Если это были не вы, проигнорируйте это письмо.</p>
        </div>
      `,
    });

    // Отправка кода на новую почту
    await sendEmail({
      toEmail: newEmail,
      subject: "Подтверждение нового email",
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Подтверждение нового email</h2>
          <p>Здравствуйте!</p>
          <p>Этот адрес электронной почты был указан как новый для аккаунта ментора ${mentor.firstName} ${mentor.lastName}.</p>
          <p>Ваш код подтверждения:</p>
          <h1 style="color: #4CAF50; text-align: center; font-size: 36px;">${newEmailCode}</h1>
          <p>Код действителен в течение 10 минут.</p>
          <p>Если вы не запрашивали это изменение, проигнорируйте это письмо.</p>
        </div>
      `,
    });

    res.json({
      success: true,
      message: "Коды подтверждения отправлены на обе почты",
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Подтверждение смены email
const confirmEmailChange = async (req, res) => {
  try {
    const { id } = req.user;
    const { currentEmailCode, newEmailCode } = req.body;

    if (!currentEmailCode || !newEmailCode) {
      return res
        .status(400)
        .json({ success: false, message: "Укажите оба кода подтверждения" });
    }

    // Проверка кода для текущей почты
    const currentEmailData = verificationCodes.get(
      `email_change_current_${id}`
    );
    if (!currentEmailData) {
      return res.status(400).json({
        success: false,
        message: "Коды не найдены. Запросите смену email заново",
      });
    }

    if (Date.now() > currentEmailData.expires) {
      verificationCodes.delete(`email_change_current_${id}`);
      verificationCodes.delete(`email_change_new_${id}`);
      return res
        .status(400)
        .json({ success: false, message: "Код истек. Запросите новый код" });
    }

    if (currentEmailData.code !== currentEmailCode) {
      return res.status(400).json({
        success: false,
        message: "Неверный код для текущей почты",
      });
    }

    // Проверка кода для новой почты
    const newEmailData = verificationCodes.get(`email_change_new_${id}`);
    if (!newEmailData || newEmailData.code !== newEmailCode) {
      return res
        .status(400)
        .json({ success: false, message: "Неверный код для новой почты" });
    }

    // Обновление email
    const mentor = await Mentor.findByIdAndUpdate(
      id,
      { email: currentEmailData.newEmail },
      { new: true, runValidators: true }
    );

    // Удаление использованных кодов
    verificationCodes.delete(`email_change_current_${id}`);
    verificationCodes.delete(`email_change_new_${id}`);

    res.json({
      success: true,
      message: "Email успешно изменен",
      mentor,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Запрос на смену пароля - отправка кода на email
const requestPasswordChange = async (req, res) => {
  try {
    const { id } = req.user;

    const mentor = await Mentor.findById(id);
    if (!mentor) {
      return res
        .status(404)
        .json({ success: false, message: "Ментор не найден" });
    }

    // Проверка, что у ментора есть пароль (не Google Auth)
    const mentorWithPassword = await Mentor.findById(id).select("+password");
    if (!mentorWithPassword.password) {
      return res.status(400).json({
        success: false,
        message: "Аккаунт создан через Google, пароль установить нельзя",
      });
    }

    // Генерация кода
    const code = generateCode();
    const expirationTime = Date.now() + 10 * 60 * 1000;

    verificationCodes.set(`password_change_${id}`, {
      code: code,
      expires: expirationTime,
    });

    // Отправка кода на email
    await sendEmail({
      toEmail: mentor.email,
      subject: "Код для смены пароля",
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Смена пароля</h2>
          <p>Здравствуйте, ${mentor.firstName} ${mentor.lastName}!</p>
          <p>Вы запросили смену пароля.</p>
          <p>Ваш код подтверждения:</p>
          <h1 style="color: #4CAF50; text-align: center; font-size: 36px;">${code}</h1>
          <p>Код действителен в течение 10 минут.</p>
          <p>Если это были не вы, немедленно свяжитесь с администрацией.</p>
        </div>
      `,
    });

    res.json({
      success: true,
      message: "Код подтверждения отправлен на вашу почту",
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Подтверждение смены пароля
const confirmPasswordChange = async (req, res) => {
  try {
    const { id } = req.user;
    const { code, newPassword } = req.body;

    if (!code || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Укажите код и новый пароль" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Пароль должен содержать минимум 6 символов",
      });
    }

    // Проверка кода
    const codeData = verificationCodes.get(`password_change_${id}`);
    if (!codeData) {
      return res.status(400).json({
        success: false,
        message: "Код не найден. Запросите смену пароля заново",
      });
    }

    if (Date.now() > codeData.expires) {
      verificationCodes.delete(`password_change_${id}`);
      return res
        .status(400)
        .json({ success: false, message: "Код истек. Запросите новый код" });
    }

    if (codeData.code !== code) {
      return res.status(400).json({ success: false, message: "Неверный код" });
    }

    // Хеширование нового пароля
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Обновление пароля
    await Mentor.findByIdAndUpdate(id, { password: hashedPassword });

    // Удаление использованного кода
    verificationCodes.delete(`password_change_${id}`);

    res.json({
      success: true,
      message: "Пароль успешно изменен",
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = {
  createMentor,
  loginMentor,
  googleMentorCallback,
  getMe,
  getMyGroup,
  getMyStudents,
  getDashboard,
  mentorNotifications,
  deleteNotify,
  createGroupWithMentor,
  updateProfile,
  requestEmailChange,
  confirmEmailChange,
  requestPasswordChange,
  confirmPasswordChange,
};
