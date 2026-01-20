const { default: mongoose, Schema } = require("mongoose");

/** @type {import("mongoose").Schema} */

const testSchema = mongoose.Schema(
  {
    testType: {
      type: String,
      required: true,
      enum: ["react", "node", "javaScript", "python", "html", "css", "vue"],
    },
    questions: [
      {
        questiondId: { type: Number, default: Date.now() },
        question: { type: String, required: true },
        variants: {
          a: { type: String, required: true },
          b: { type: String, required: true },
          c: { type: String, required: true },
          d: { type: String, required: true },
        },
        correctAnswer: {
          type: String,
          enum: ["a", "b", "c", "d"],
          required: true,
          select: false,
        },
        questionsScore: { type: Number, required: true },
      },
    ],
    testTitle: { type: String, required: true },
    testGrade: {
      type: String,
      required: true,
      enum: ["junior", "strongJunior", "middle", "strongMiddle", "senior"],
    },
    gradeExperience: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    testDescribe: {
      type: String,
      default: function () {
        return this.testTitle;
      },
    },
    results: [{ type: Schema.Types.ObjectId, ref: "Result" }],
    averageResult: { type: Number, default: 0 },
    testTime: { type: Number, default: 1200000 },
  },
  {
    timestamps: true,
  },
);

testSchema.virtual("questionsCount").get(function () {
  return this.questions?.length || 0;
});

testSchema.virtual("maxScore").get(function () {
  if (!Array.isArray(this.questions)) return 0;
  let score = 0;
  this.questions.forEach((f) => {
    score += f.questionsScore;
  });
  return score;
});

testSchema.set("toJSON", { virtuals: true });
testSchema.set("toObject", { virtuals: true });

const Test = mongoose.model("Test", testSchema);
module.exports = Test;
