const { array, success } = require("zod");
const Result = require("./result.model");
const Test = require("./test.model");
const { User, grades } = require("../user/user.model");
const { sendToUser } = require("../socket/notify");
const Notify = require("../notification/notify.model");

// helper function notify jonatishga
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

// hamma bor testlani olish

const getAllTests = async (req, res) => {
  try {
    const tests = await Test.find();
    res.json({ success: true, tests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// id boyicha 1 ta testni olish
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


// yangi test create qilish (faqat admin ni dostupi bor)
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

    const newTest = new Test({testType , questions , testTitle , testGrade , gradeExperience});
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

    // select qilinvotti chunki togri javolari olib tashlangan (model da select:false qilingan)
    const test = await Test.findById(testId).select("+questions.correctAnswer");
    const user = await User.findById(userId);

    if (!test) {
      return res
        .status(404)
        .json({ success: false, message: "test not found" });
    }

    let score = 0;
    let checkedAnswers = [];

    // javoblarni tekshirish
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

    const result = new Result({
      user: userId,
      test: testId,
      score,
      answers: checkedAnswers,
      successRate: procent,
    })
    await result.save();
    await result.populate("test")

// user ga notifcation jonatish test tugaganda (websocket)
    await sendToUser(userId, {
      title: "Тест завершён 🎉",
      text: `Результат: ${Math.round(procent)}%`,
      notifyType: "success",
    });

    user.testsHistory.push(result);
    await user.save();

    // agar ogan testdan otgani 85 fozidan kotta bosa gradeexprence ga test qancha expirence bersa qoshiladi
    if (procent >= 85) {
      user.gradeExperience += test.gradeExperience || 0;

      if (user.gradeExperience >= 100) {
        const currentUserGrade = grades.findIndex((g) => g === user.grade);
        if (currentUserGrade < grades.length - 1) {
          const oldGrade = user.grade;
          user.grade = grades[currentUserGrade + 1];
          user.gradeExperience = 0;

          // studentga websocket orqali gradeUP hadiqa notification jonatish
          await sendToUser(userId, {
            title: "Повышение ранга 🚀",
            text: `Ваш ранг повышен с ${oldGrade} на ${user.grade}`,
            notifyType: "gradeUp",
          });
        }
      }

      await user.save();
    }

    // testni update qilish (shu testdan ortacha ball nechi olionishi ni ozgartirish)
    test.results.push(result._id);
    const allResults = await Result.find({ test: test._id });
    const average = Math.round(
      allResults.reduce((accum, item) => accum + item.score, 0) /
        allResults.length,
    );
    test.averageResult = average;
    await test.save();

    res.json({ success: true, result });
  } catch (err) {
    console.error("AddResult error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// token dagi id orqali shu user ni hamma resultarini olish
const getResults = async (req, res) => {
  try {
    const { id } = req.user;
    const tests = await Result.find({ user: id });

    res.json({ tests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// qanaqa type dagi test la borligini olish
const getAllTypesTest = async (req, res) => {
  try {
    const types = await Test.distinct("testType");
    res.json({ types, count: types.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createNewTest,
  getAllTests,
  getTestById,
  addResult,
  getResults,
  getAllTypesTest,
};
