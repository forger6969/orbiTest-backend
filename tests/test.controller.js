const { array } = require("zod");
const Result = require("./result.model");
const Test = require("./test.model");
const { User, grades } = require("../user/user.model");
const { sendToUser } = require("../socket/notify");
const Notify = require("../notification/notify.model");

const createAndSendNotify = async ({
  userId,
  title,
  text,
  notifyType = "success",
}) => {
  const notify = await Notify.create({
    user: userId,
    title,
    text,
    notifyType,
  });

  sendToUser(userId, "notification", notify);
};

const getAllTests = async (req, res) => {
  try {
    const tests = await Test.find();
    res.json({ success: true, tests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getTestById = async (req, res) => {
  try {
    const { id } = req.params;

    const test = await Test.findById(id);

    if (!test) {
      return res
        .status(404)
        .json({ success: false, message: "Test not found" });
    }

    res.json({ success: true, test });
  } catch (err) {}
};

const createNewTest = async (req, res) => {
  try {
    const { testType, questions, testTitle, testGrade, gradeExperience } =
      req.body;

    if (
      !testType ||
      !questions ||
      !testTitle ||
      !testGrade ||
      !gradeExperience
    ) {
      return res
        .status(400)
        .json({ success: false, message: "add required fields" });
    }

    const newTest = new Test(req.body);
    await newTest.save();

    res.json({ success: true, newTest });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const addResult = async (req, res) => {
  try {
    const { testId, answers } = req.body;
    const { id: userId } = req.user;

    if (!testId || !answers) {
      return res
        .status(400)
        .json({ success: false, message: "add required fields!" });
    }

    const test = await Test.findById(testId).select("+questions.correctAnswer");
    const user = await User.findById(userId);

    if (!test) {
      return res.status(404).json({ success: false, message: "test not found" });
    }

    let score = 0;
    let checkedAnswers = [];

    // Проверяем ответы
    test.questions.forEach((q) => {
      const userAnswer = answers.find((f) => f.questionId === q._id.toString());
      if (!userAnswer) return;

      const isCorrect = userAnswer.answer === q.correctAnswer;
      if (isCorrect) score += q.questionsScore;

      checkedAnswers.push({
        questionId: q._id.toString(),
        answer: userAnswer.answer,
        correct: isCorrect,
      });
    });

    const procent = (score / test.maxScore) * 100;

    // Сохраняем результат
    const result = new Result({
      user: userId,
      test: testId,
      score,
      answers: checkedAnswers,
      successRate: procent,
    });
    await result.save();

    // Создаем уведомление о завершении теста
    await sendToUser(userId, {
      title: "Тест завершён 🎉",
      text: `Результат: ${Math.round(procent)}%`,
      notifyType: "success",
    });

    // Если успех >= 85%, повышаем опыт и ранг
    if (procent >= 85) {
      user.gradeExperience += test.gradeExperience || 0;

      if (user.gradeExperience >= 100) {
        const currentUserGrade = grades.findIndex((g) => g === user.grade);
        if (currentUserGrade < grades.length - 1) {
          const oldGrade = user.grade;
          user.grade = grades[currentUserGrade + 1];
          user.gradeExperience = 0;

          // Уведомление о повышении ранга
          await sendToUser(userId, {
            title: "Повышение ранга 🚀",
            text: `Ваш ранг повышен с ${oldGrade} на ${user.grade}`,
            notifyType: "gradeUp",
          });
        }
      }

      await user.save();
    }

    // Обновляем тест: результаты + средний балл
    test.results.push(result._id);
    const allResults = await Result.find({ test: test._id });
    const average = Math.round(
      allResults.reduce((accum, item) => accum + item.score, 0) /
      allResults.length
    );
    test.averageResult = average;
    await test.save();

    res.json({ success: true, result, user });
  } catch (err) {
    console.error("AddResult error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createNewTest,
  getAllTests,
  getTestById,
  addResult,
};
