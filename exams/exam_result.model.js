const { default: mongoose, Schema } = require("mongoose");

const resultSchema = mongoose.Schema({
  examId: { type: Schema.Types.ObjectId, ref: "Exam", required: true },
  projectLink: { type: String , required:true},
  describe:{type:String , default:null}
},
{
    timestamps:true
});

const examResult = mongoose.model("examResult" , resultSchema)
module.exports = examResult