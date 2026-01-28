const { default: mongoose } = require("mongoose");

const mentorSchema = mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  grade: {
    type: String,
    enum: ["junior", "middle", "senior"],
    default: "junior",
  },
});

const Mentor = mongoose.model("Mentor", mentorSchema);

module.exports = Mentor;
