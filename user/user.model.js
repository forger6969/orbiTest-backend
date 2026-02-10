const { default: mongoose, Schema } = require("mongoose");

const userSchema = mongoose.Schema({
  username: {
    type: String,
    required: function () {
      return !this.googleId; // Обязательно только если не Google-пользователь
    },
  },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: {
    type: String,
    required: function () {
      return !this.googleId; // Обязательно только если не Google-пользователь
    },
    select: false,
  },
  groupID: { type: Schema.Types.ObjectId, ref: "Group", default: null },
  grade: {
    type: String,
    enum: ["junior", "strongJunior", "middle", "strongMiddle", "senior"],
    default: "junior",
  },
  gradeExperience: { type: Number, default: 0 },
  testsHistory: [{ type: Schema.Types.ObjectId, ref: "Result" }],
  role: { type: String, enum: ["user", "admin"], default: "user" },
  avatar: {
    type: String,
    default:
      "https://static.vecteezy.com/system/resources/thumbnails/009/292/244/small/default-avatar-icon-of-social-media-user-vector.jpg",
  },
  mentor: { type: Schema.Types.ObjectId, ref: "Mentor" },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  isProfileComplete: {
    type: Boolean,
    default: true, // ✅ По умолчанию true для обратной совместимости
  },
});

/** @type {import("mongoose").Model} */
const User = mongoose.model("User", userSchema);
const grades = ["junior", "strongJunior", "middle", "strongMiddle", "senior"];

module.exports = { User, grades };
