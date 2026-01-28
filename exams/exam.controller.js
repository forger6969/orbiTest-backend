const Group = require("../groups/group.model");
const { sendExamNotification } = require("../telegrambot/bot");
const { User } = require("../user/user.model");
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

    const startDate = new Date(examStart);
    const endDate = new Date(examEnd);
    const now = new Date();

    if (startDate < now) {
      return res.status(400).json({
        success: false,
        message: "Нельзя создать экзамен с началом в прошлом",
      });
    }

    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: "Дата окончания экзамена должна быть после начала",
      });
    }
    // pending;

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
    const { projectLink, describe, examId } = req.body;
    const { id } = req.user;

    if (!projectLink || !examId) {
      return res
        .status(400)
        .json({ success: false, message: "Добавьте обязаетльные поля" });
    }

    const exam = await Exam.findById(examId);

    if (!exam) {
      return res
        .status(404)
        .json({ success: false, message: "Не удалось найти экзамен" });
    }

    if (exam.status === "completed") {
      return res
        .status(410)
        .json({ success: false, message: "Этот экзамен уже закончен" });
    }

    const result = new examResult({
      projectLink,
      examId,
      describe: describe ? describe : null,
      user: id,
      requirements: exam.requirements,
    });

    await result.save();

    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getMyGroupExams = async (req, res) => {
  try {
    const { id } = req.user;

    const findUser = await User.findById(id);
    const group = findUser.groupID;

    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Вы еще не добавлены в группу" });
    }

    const exams = await Exam.find({ group });

    if (!exams || exams.length <= 0) {
      return res.status(200).json({
        success: true,
        message: "У этой группы пока нету экзаменов",
        exams: exams ? exams : [],
      });
    }

    res.json({ success: true, exams });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createExam,
  getAllExams,
  addResult,
  getMyGroupExams,
};
