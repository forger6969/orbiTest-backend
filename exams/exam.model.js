const { default: mongoose, Schema, model } = require("mongoose");

const examSchema = mongoose.Schema({
  examResource: { type: String, required: true },
  selectedTest: { type: Schema.Types.ObjectId, ref: "Test" },
  requirements: [
    {
      requirement: { type: String, required: true },
      score: { type: Number, required: true  , min:1 , max:10},
    },
  ],
  examDescribe: { type: String, default: "" },
  status: { required: true, enum: ["pending", "appreciated", "denied"] },
  score: { type: Number, min: 1, max: 100, default: 0 },
  feedback: { type: String, default: "" },
  student: { type: Schema.Types.ObjectId, ref: "User", required: true },
  group: { type: Schema.Types.ObjectId, ref: "Group", required: true },
});

const Exam = mongoose.model("Exam", examSchema);
module.exports = Exam;
