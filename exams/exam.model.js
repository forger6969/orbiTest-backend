const { default: mongoose, Schema } = require("mongoose");

const examSchema = new Schema(
  {
    examTitle: { type: String, required: true },
    requirements: [
      {
        requirement: { type: String, required: true },
        score: { type: Number, required: true, min: 1, max: 10 },
      },
    ],
    examDescribe: { type: String, default: "" },
    status: {
      type: String,
      enum: ["completed", "underway"],
      default: "underway",
    },
    examStart: { type: Date, required: true },
    examEnd: { type: Date, required: true },
    isEnd: { type: Boolean, default: false },
    group: { type: Schema.Types.ObjectId, ref: "Group", required: true },
    
    // ⭐ ЕДИНСТВЕННОЕ НОВОЕ ПОЛЕ для работы Agenda
    lastReminderSent: { type: Date, default: null }
  },
  {
    timestamps: true,
  },
);

examSchema.virtual("maxScore").get(function () {
  if (!this.requirements || this.requirements.length === 0) return 0;
  return this.requirements.reduce((total, r) => total + (r.score || 0), 0);
});

examSchema.set("toJSON", { virtuals: true });
examSchema.set("toObject", { virtuals: true });

const Exam = mongoose.model("Exam", examSchema);
module.exports = Exam;