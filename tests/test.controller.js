const { array } = require("zod");
const Result = require("./result.model");
const Test = require("./test.model");
const User = require("../user/user.model");

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
    const { id } = req.user;

    if (!testId || !answers) {
      return res
        .status(400)
        .json({ success: false, message: "add reqired fields!" });
    }

    const test = await Test.findById(testId).select("+questions.correctAnswer");
    const user = await User.findById(id)

    if (!test) {
      return res
        .status(404)
        .json({ success: false, message: "test not found" });
    }

    let score = 0;
    let checkedAnswers = [];

    test.questions.forEach((q) => {
      const userAnswer = answers.find((f) => f.questionId === q._id.toString());

      if (!userAnswer) {
        return;
      }

      const isCorrect = userAnswer.answer === q.correctAnswer;

      if (isCorrect) {
        score += q.questionsScore;
      }

      checkedAnswers.push({
        questionId: q._id.toString(),
        answer: userAnswer.answer,
        correct: isCorrect,
      });
    });

    const result = new Result({
      user: id,
      test: testId,
      score,
      answers: checkedAnswers,
    });

    await result.save();

    const procent = (result.score / test.maxScore) * 100

    if (procent >= 85) {
    }


    res.json({ result });

    const allResults = await Result.find({test: test._id})
    console.log(allResults);


    const average =  Math.round(allResults.reduce((accum , item)=> accum + item.score , 0) / allResults.length)
    console.log(average);
    

    test.results.push(result._id)
    test.averageResult = average
    await test.save()

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createNewTest,
  getAllTests,
  getTestById,
  addResult,
};
