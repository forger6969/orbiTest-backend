const Group = require("../groups/group.model");
const { sendToMentor } = require("../socket/notify");
const {
  sendExamNotification,
  sendExamResultsToParents,
} = require("../telegrambot/bot");
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

    const user = await User.findById(id);
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

    const findMatch = await examResult.findOne({ user: id, examId: examId });

    if (findMatch) {
      return res
        .status(410)
        .json({ success: false, message: "Вы уже сдали етот экзамен" });
    }

    const result = new examResult({
      projectLink,
      examId,
      describe: describe ? describe : null,
      user: id,
      requirements: exam.requirements,
    });

    await result.save();
    await sendToMentor(user.mentor, {
      type: "reminder",
      title: "Новый результат!",
      text: `Студент отправил результат экзамена ${exam.examTitle}`,
      student: user._id,
      additionalData: {
        studentName: `${user.firstName} ${user.lastName}`,
      },
    });

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

const getMyExamsMentor = async (req, res) => {
  try {
    const { id } = req.user;

    const exams = await Exam.find()
      .populate({
        path: "group",
        match: { mentor: id },
      })
      .then((res) => res.filter((exam) => exam.group !== null));

    res.json({ exams });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getResultsThisExam = async (req, res) => {
  try {
    const { id } = req.params;

    const results = await examResult.find({ examId: id });
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getDetails = async (req, res) => {
  try {
    const { id } = req.body;

    const exam = await Exam.findById(id);
    if (!exam) {
      return res
        .status(404)
        .json({ success: false, message: "Exam not found" });
    }

    const results = await examResult.find({ examId: id });

    res.json({ success: true, exam, results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const evaluateExamResult = async (req, res) => {
  try {
    const { resultId, evaluatedRequirements, feedback } = req.body;
    const { id: mentorId } = req.user;

    if (
      !resultId ||
      !evaluatedRequirements ||
      !Array.isArray(evaluatedRequirements)
    ) {
      return res.status(400).json({
        success: false,
        message: "Добавьте обязательные поля: resultId и evaluatedRequirements",
      });
    }

    const result = await examResult.findById(resultId).populate({
      path: "examId",
      populate: {
        path: "group",
        select: "mentor",
      },
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Результат экзамена не найден",
      });
    }

    if (result.examId.group.mentor.toString() !== mentorId.toString()) {
      return res.status(403).json({
        success: false,
        message: "У вас нет прав для оценки этого экзамена",
      });
    }

    if (result.status === "appreciated" || result.status === "rejected") {
      return res.status(400).json({
        success: false,
        message: "Этот результат уже был оценен",
      });
    }

    if (evaluatedRequirements.length !== result.requirements.length) {
      return res.status(400).json({
        success: false,
        message: "Количество оцененных требований не совпадает с оригинальными",
      });
    }

    let totalScore = 0;
    const updatedRequirements = result.requirements.map((req, index) => {
      const evaluated = evaluatedRequirements[index];

      if (!evaluated || typeof evaluated.isDone !== "boolean") {
        throw new Error(`Некорректные данные для требования ${index + 1}`);
      }

      totalScore += evaluated.isDone ? req.score : 0;

      return {
        requirement: req.requirement,
        score: req.score,
        isDone: evaluated.isDone,
      };
    });

    const maxScore = result.examId.maxScore;
    const passThreshold = maxScore * 0.6;
    const newStatus = totalScore >= passThreshold ? "appreciated" : "rejected";

    result.requirements = updatedRequirements;
    result.score = totalScore;
    result.status = newStatus;
    if (feedback) {
      result.describe = feedback;
    }

    await result.save();

    res.json({
      success: true,
      message: `Экзамен ${newStatus === "appreciated" ? "сдан" : "не сдан"}`,
      result: {
        _id: result._id,
        score: totalScore,
        maxScore: maxScore,
        status: newStatus,
        requirements: updatedRequirements,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const getResultsForEvaluation = async (req, res) => {
  try {
    const { examId } = req.params;
    const { id: mentorId } = req.user;

    const exam = await Exam.findById(examId).populate("group");

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Экзамен не найден",
      });
    }

    if (exam.group.mentor.toString() !== mentorId.toString()) {
      return res.status(403).json({
        success: false,
        message: "У вас нет прав для просмотра этих результатов",
      });
    }

    const results = await examResult
      .find({ examId })
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      exam: {
        title: exam.examTitle,
        maxScore: exam.maxScore,
      },
      results,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const getResultDetail = async (req, res) => {
  try {
    const { resultId } = req.params;
    const { id: userId, role } = req.user;

    const result = await examResult
      .findById(resultId)
      .populate("user", "name email")
      .populate({
        path: "examId",
        populate: {
          path: "group",
          select: "mentor name",
        },
      });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Результат не найден",
      });
    }

    const isMentor =
      result.examId.group.mentor.toString() === userId.toString();
    const isOwner = result.user._id.toString() === userId.toString();

    if (!isMentor && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "У вас нет прав для просмотра этого результата",
      });
    }

    res.json({
      success: true,
      result,
      exam: {
        title: result.examId.examTitle,
        maxScore: result.examId.maxScore,
        requirements: result.examId.requirements,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const sendResultsToParents = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findById(id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Экзамен не найден",
      });
    }

    await sendExamResultsToParents(exam._id);

    res.status(200).json({
      success: true,
      message: "Результаты успешно отправлены родителям",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const getExamById = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findById(id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Экзамен не найден",
      });
    }

    res.json({
      success: true,
      exam,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  createExam,
  getAllExams,
  addResult,
  getMyGroupExams,
  getMyExamsMentor,
  evaluateExamResult,
  getResultsForEvaluation,
  getResultDetail,
  getDetails,
  sendResultsToParents,
  getExamById,
};
