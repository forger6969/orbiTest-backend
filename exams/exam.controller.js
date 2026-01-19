const Group = require("../groups/group.model");
const { sendExamNotification } = require("../telegrambot/bot");
const Exam = require("./exam.model");
const examResult = require("./exam_result.model");

const createExam = async (req, res) => {
  try {
    const { examTitle, requirements, examDescribe, examStart, examEnd, group } =
      req.body;
    const body = req.body;
    console.log(body);
    

    if (!examTitle || !requirements || !examStart || !examEnd || !group) {
      return res
        .status(400)
        .json({ success: false, message: "Add required fields" });
    }

    const findGroup = await Group.findById(group);
    if (!findGroup) {
      return res
        .status(404)
        .json({ success: false, message: "group is not found" });
    }

    const exam = new Exam(body);
    await exam.save();
   
    sendExamNotification(exam)

    res.json({success:true , exam})
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAllExams = async (req , res)=>{
  try {

    const exams = await Exam.find()
    res.json({success:true , exams})
    
  } catch (err) {
    res.status(500).json({success:false , message:err.message})
  }
}

module.exports = {
  createExam,
  getAllExams
}