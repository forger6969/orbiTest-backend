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

// ✅ CALLBACK ДЛЯ GOOGLE AUTH (МЕНТОРЫ)
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
};
