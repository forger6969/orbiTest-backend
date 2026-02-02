const { bot } = require("../telegrambot/bot");
const { User } = require("../user/user.model");
const Group = require("./group.model");

const createGroup = async (req, res) => {
  try {
    const { groupName, groupDescribe, groupTime, groupDay, mentor } = req.body;

    if (!groupName || !groupDescribe || !groupTime || !groupDay) {
      return res
        .status(400)
        .json({ success: false, message: "add required fileds" });
    }

    const group = new Group({
      groupName,
      groupDescribe,
      groupTime,
      groupDay,
      mentor,
    });
    await group.save();

    res.json({ group });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const addStudentToGroup = async (req, res) => {
  try {
    const { studentId, groupId } = req.body;

    if (!studentId || !groupId) {
      return res.status(400).json({
        success: false,
        message: "studentId and groupId is required!",
      });
    }

    const user = await User.findById(studentId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "user not found" });
    }

    // const updatedGroup = await Group.findByIdAndUpdate(
    //   groupId,
    //   {
    //     $addToSet: { students: studentId },
    //   },
    //   {
    //     new: true,
    //   },
    // );

    const group = await Group.findById(groupId);

    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "group not found" });
    }

    // grouppani studentlariini ichidan hozir qoshilmoqchi bolgan user ni find qilish
    const findUserInGroup = group.students.find(
      (f) => f.toString() === studentId
    );

    // agar group da bu student uje bosa qosholmidigan qilish
    if (findUserInGroup) {
      return res.status(400).json({
        success: false,
        message: "Student bu gruppaga allaqachon qoshilgan",
      });
    }

    // agar bu student hali bu gruppada bomasa user ni group ga qoshish
    group.students.push(studentId);
    await group.save();

    user.groupID = groupId;
    await user.save();

    res.json({ success: true, group });
    // agar grouppani telegrami bosa shu telegram grouppaga message jonatish
    if (group.telegramId) {
      bot.sendMessage(
        group.telegramId,
        `👤Sizni guruhingizga yangi student qoshildi\nIsm:${user.firstName}\nFamiliya:${user.lastName}
        `,
        { parse_mode: "Markdown" }
      );
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAllGroups = async (req, res) => {
  try {
    const groups = await Group.find();
    res.json({ success: true, groups });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getMyGroup = async (req, res) => {
  try {
    const { id } = req.user;

    const user = await User.findById(id);

    if (!user.groupID) {
      return res
        .status(200)
        .json({ success: true, message: "Вы еще не добавленвы в группу" });
    }

    const group = await Group.findById(user.groupID).populate({
      path: "students",
      select: "-testsHistory",
    });

    res.json({ success: true, group });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createGroup,
  addStudentToGroup,
  getAllGroups,
  getMyGroup,
};
