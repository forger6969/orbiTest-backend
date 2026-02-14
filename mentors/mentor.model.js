const { default: mongoose } = require("mongoose");

const mentorSchema = mongoose.Schema({
  firstName: { type: String, required: [true, "Имя обязательно"] },
  lastName: { type: String, required: [true, "Фамилия обязательна"] },
  email: {
    type: String,
    required: [true, "Email обязателен"],
    unique: [true, "Пользователь с таким email уже зарегистрирован"],
    match: [/^\S+@\S+\.\S+$/, "Некорректный формат email"],
  },
  password: {
    type: String,
    required: [
      function () {
        return !this.googleId;
      },
      "Пароль обязателен",
    ],
    select: false,
  },

  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  avatar: {
    type: String,
    default: null,
  },
  bio: { type: String, default: null },
  grade: {
    type: String,
    enum: {
      values: ["junior", "middle", "senior"],
      message: "Уровень должен быть junior, middle или senior",
    },
    required: [true, "Уровень обязателен"],
  },
  skills: [
    {
      skillTitle: {
        type: String,
        required: [true, "Название навыка обязательно"],
      },
      skillDescribe: {
        type: String,
        required: [true, "Описание навыка обязательно"],
      },
    },
  ],
  yearsExperience: { type: Number, default: null },
});

const Mentor = mongoose.model("Mentor", mentorSchema);
module.exports = Mentor;
