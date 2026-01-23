const Group = require("../groups/group.model");
const { sendExamNotification } = require("../telegrambot/bot");
const Exam = require("./exam.model");
const examResult = require("./exam_result.model");

const createExam = async (req, res) => {
  try {
    const { examTitle, requirements, examDescribe, examStart, examEnd, group } =
      req.body;


    if (!examTitle || !requirements || !examStart || !examEnd || !group) {
      return res
        .status(400)
        .json({ success: false, message: "Add required fields" });
    }

    // Конвертируем строки в даты
    const startDate = new Date(examStart);
    const endDate = new Date(examEnd);
    const now = new Date();

    // Проверка: нельзя создать экзамен в прошлом
    if (startDate < now) {
      return res.status(400).json({
        success: false,
        message: "Нельзя создать экзамен с началом в прошлом",
      });
    }

    // Проверка: дата окончания должна быть после начала
    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: "Дата окончания экзамена должна быть после начала",
      });
    }pending

  
    const findGroup = await Group.findById(group);
    if (!findGroup) {
      return res
        .status(404)
        .json({ success: false, message: "Group is not found" });
    }


    const exam = new Exam({
      examTitle,
      requirements,
      examDescribe,
      examStart: startDate,
      examEnd: endDate,
      group,
    });

    await exam.save();

    sendExamNotification(exam);

    res.json({ success: true, exam });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAllExams = async (req, res) => {
  try {
    const exams = await Exam.find();
    res.json({ success: true, exams });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const addResult = async (req, res) => {
  try {
    
    const {projectLink , describe , examId} = req.body

    if (!projectLink || !examId) {
      
    }

  } catch (err) {
    res.status(500).json({success:false , message:err.message})
  }
}

module.exports = {
  createExam,
  getAllExams,
};
