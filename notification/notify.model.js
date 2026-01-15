const { default: mongoose, Schema } = require("mongoose");

const notifySchema = mongoose.Schema({
  title: { type: String, required: true },
  text: { type: String, required: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  notifyType: {
    type: String,
    enum: ["gradeUp", "error", "warning", "success"],
  },
  status:{type:String , enum:["viewed" , "pending"]},
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24 * 2, 
  },
});
