const { default: mongoose, Schema } = require("mongoose");

const userSchema = mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  groupID: { type: Schema.Types.ObjectId, ref: "Group", default: "guest" },
  grade: {
    type: String,
    enum: ["junior", "strongJunior", "middle", "strongMiddle", "senior"],
    default: "junior",
  },
  testsHistory:[{type:Schema.Types.ObjectId , ref:"TestResult"}],

});

/** @type {import("mongoose").Model} */
const User = mongoose.model("User", userSchema);

module.exports = User;
