const { default: mongoose, Schema } = require("mongoose");

const resultSchema = mongoose.Schema(
  {
    examId: { type: Schema.Types.ObjectId, ref: "Exam", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    projectLink: { type: String, required: true },
    describe: { type: String, default: null },
    status: {
      type: String,
      enum: ["appreciated", "rejected", "pending"],
      default: "pending",
    },
    score: { type: Number, default: 0 },
    requirements: [
      {
        requirement: { type: String, required: true },
        score: { type: Number, required: true, min: 1, max: 10 },
        isDone:{type:Boolean , default:false}
      },
    ],
  },
  {
    timestamps: true,
  },
);

const examResult = mongoose.model("examResult", resultSchema);
module.exports = examResult;
