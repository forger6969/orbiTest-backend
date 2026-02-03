// mentorNotify.model.js
const { default: mongoose } = require("mongoose");

const mentorNotifySchema = mongoose.Schema({
  title: { type: String, required: true },
  text: { type: String, required: true },
  mentor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Mentor",
    required: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  test: { type: mongoose.Schema.Types.ObjectId, ref: "Test" },
  result: { type: mongoose.Schema.Types.ObjectId, ref: "Result" },
  notifyType: {
    type: String,
    enum: ["testCompleted", "gradeUp", "warning", "info"],
    default: "info",
  },
  status: {
    type: String,
    enum: ["viewed", "pending"],
    default: "pending",
  },
  additionalData: {
    score: Number,
    successRate: Number,
    testTitle: String,
    studentName: String,
    studentGrade: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24 * 7, // 7 дней
  },
});

const MentorNotify = mongoose.model("MentorNotify", mentorNotifySchema);
module.exports = MentorNotify;
