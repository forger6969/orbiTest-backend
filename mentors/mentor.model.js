const { default: mongoose } = require("mongoose");

const mentorSchema = mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  bio: { type: String, default: null },
  grade: {
    type: String,
    enum: ["junior", "middle", "senior"],
    required: true,
  },
  skills: [
    {
      skillTitle: { type: String, required: true },
      skillDescribe: { type: String, required: true },
    },
  ],
});

const Mentor = mongoose.model("Mentor", mentorSchema);

module.exports = Mentor;
