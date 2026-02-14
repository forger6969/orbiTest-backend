const { default: mongoose, Schema } = require("mongoose");

/** @type {import("mongoose").Schema} */

const testSchema = mongoose.Schema(
  {
    testType: {
      type: String,
      required: [true, "Тип теста обязателен"],
      enum: {
        values: ["react", "node", "javaScript", "python", "html", "css", "vue"],
        message: "Некорректный тип теста",
      },
    },
    questions: [
      {
        questiondId: { type: Number, default: Date.now() },
        question: { type: String, required: [true, "Текст вопроса обязателен"] },
        variants: {
          a: { type: String, required: [true, "Вариант 'a' обязателен"] },
          b: { type: String, required: [true, "Вариант 'b' обязателен"] },
          c: { type: String, required: [true, "Вариант 'c' обязателен"] },
          d: { type: String, required: [true, "Вариант 'd' обязателен"] },
        },
        correctAnswer: {
          type: String,
          enum: {
            values: ["a", "b", "c", "d"],
            message: "Верный ответ должен быть a, b, c или d",
          },
          required: [true, "Верный ответ обязателен"],
          select: false,
        },
        questionsScore: {
          type: Number,
          required: [true, "Баллы за вопрос обязательны"],
        },
      },
    ],
    testTitle: { type: String, required: [true, "Заголовок теста обязателен"] },
    testGrade: {
      type: String,
      required: [true, "Уровень теста обязателен"],
      enum: {
        values: ["junior", "strongJunior", "middle", "strongMiddle", "senior"],
        message: "Некорректный уровень сложности",
      },
    },
    gradeExperience: {
      type: Number,
      required: [true, "Опыт за тест обязателен"],
      min: [1, "Минимальный опыт - 1"],
      max: [10, "Максимальный опыт - 10"],
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
  }
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
