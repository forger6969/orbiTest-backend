const { default: mongoose, Schema } = require("mongoose");

const examSchema = new Schema(
  {
    examTitle: { type: String, required: [true, "Заголовок экзамена обязателен"] },
    requirements: [
      {
        requirement: { type: String, required: [true, "Требование обязательно"] },
        score: {
          type: Number,
          required: [true, "Баллы обязательны"],
          min: [1, "Минимум 1 балл"],
          max: [10, "Максимум 10 баллов"],
        },
      },
    ],
    examDescribe: { type: String, default: "" },
    status: {
      type: String,
      enum: {
        values: ["completed", "underway"],
        message: "Статус должен быть 'completed' или 'underway'",
      },
      default: "underway",
    },
    examStart: { type: Date, required: [true, "Дата начала обязательна"] },
    examEnd: { type: Date, required: [true, "Дата окончания обязательна"] },
    isEnd: { type: Boolean, default: false },
    group: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: [true, "Группа обязательна"],
    },

    lastReminderSent: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

examSchema.virtual("maxScore").get(function () {
  if (!this.requirements || this.requirements.length === 0) return 0;
  return this.requirements.reduce((total, r) => total + (r.score || 0), 0);
});

examSchema.set("toJSON", { virtuals: true });
examSchema.set("toObject", { virtuals: true });

const Exam = mongoose.model("Exam", examSchema);
module.exports = Exam;
