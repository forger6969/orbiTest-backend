const { default: mongoose, Schema } = require("mongoose");

const groupSchema = mongoose.Schema(
  {
    groupName: { type: String, required: true },
    groupDescribe: { type: String, default: "" },
    students: [{ type: Schema.Types.ObjectId, ref: "User", unique: true }],
    avatar: {
      type: String,
      default:
        "https://media.licdn.com/dms/image/sync/v2/D4D27AQF-rPowGZp8QA/articleshare-shrink_800/articleshare-shrink_800/0/1729615523861?e=2147483647&v=beta&t=vd4PiWwC7S8HwDvyd8q57Y2LppPmDqi0cna6KImOT0o",
    },
    groupPerformance: { type: Number, default: 0 },
    groupTime: { type: String, required: true },
    groupDay: { type: String, enum: ["even", "odd"] },
    telegramId: { type: String, default: null },
    parentsTelegramId: { type: String, default: null },
    mentor: { type: Schema.Types.ObjectId, ref: "Mentor", required: true },
    attemptsCount: { type: Number, default: 0 },
    totalScore: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

const Group = mongoose.model("Group", groupSchema);
module.exports = Group;
