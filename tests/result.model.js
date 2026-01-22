const { default: mongoose, Schema } = require("mongoose");

const resultSchema = mongoose.Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  test: { type: Schema.Types.ObjectId, ref: "Test", required: true },
  score: { type: Number, required: true },
  answers: [
    {
      questionId: { type: String, required: true },
      answer: { type: String, required: true, enum: ["a", "b", "c", "d"] },
      correct: { type: Boolean, required: true },
    },
  ],
  successRate: { type: Number, required: true },
},
{
  timestamps:true
});

const Result = mongoose.model("Result", resultSchema);

module.exports = Result;
