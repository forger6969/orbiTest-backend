const Mentor = require("./mentor.model");

const createMentor = async (req, res) => {
  try {
    const { firstName, lastName, email, password, grade } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Заполните обязательные поля" });
    }

    const newMentor = new Mentor({
      firstName,
      lastName,
      email,
      password,
      grade: grade ? grade : "junior",
    });

    await Mentor.save();

    res.json({ success: true, newMentor });
  } catch (err) {
    console.log(err);
  }
};

module.exports = {
  createMentor,
};
