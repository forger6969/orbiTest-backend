const { sendToStudentMentor, sendToMentor } = require("../socket/notify");
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

    const studentCurrentGroup = user.groupID
      ? await Group.findById(user.groupID)
      : null;

    const oldMentorId = studentCurrentGroup?.mentor;

    if (user.groupID) {
      if (studentCurrentGroup) {
        studentCurrentGroup.students = studentCurrentGroup.students.filter(
          (id) => id.toString() !== studentId
        );
        await studentCurrentGroup.save();
      }

      if (studentCurrentGroup?.telegramId) {
        bot.sendMessage(
          studentCurrentGroup.telegramId,
          `👋 *Student guruhdan chiqdi*\n\n` +
            `Ism: ${user.firstName}\n` +
            `Familiya: ${user.lastName}\n\n` +
            `Student boshqa guruhga o'tkazildi.`,
          { parse_mode: "Markdown" }
        );
      }
    }

    const group = await Group.findById(groupId);

    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "group not found" });
    }

    const findUserInGroup = group.students.find(
      (f) => f.toString() === studentId
    );

    if (findUserInGroup) {
      return res.status(400).json({
        success: false,
        message: "Student bu gruppaga allaqachon qoshilgan",
      });
    }

    group.students.push(studentId);
    await group.save();

    user.groupID = groupId;
    user.mentor = group.mentor;
    await user.save();

    res.json({ success: true, group });

    // agar grouppani telegrami bosa shu telegram grouppaga message
    if (group.telegramId) {
      bot.sendMessage(
        group.telegramId,
        `👤Sizni guruhingizga yangi student qoshildi\nIsm:${user.firstName}\nFamiliya:${user.lastName}`,
        { parse_mode: "Markdown" }
      );
    }

    if (oldMentorId && studentCurrentGroup) {
      await sendToMentor(oldMentorId, {
        title: "Студент покинул группу ⚠️",
        text: `${user.firstName} ${user.lastName} переведен из группы "${studentCurrentGroup.groupName}"`,
        notifyType: "info",
        student: studentId,
        additionalData: {
          studentName: `${user.firstName} ${user.lastName}`,
          oldGroupName: studentCurrentGroup.groupName,
        },
      });
    }

    if (group.mentor) {
      await sendToMentor(group.mentor, {
        title: "Новый студент в группе ✅",
        text: `${user.firstName} ${user.lastName} добавлен в группу "${group.groupName}"${
          studentCurrentGroup
            ? ` (переведен из "${studentCurrentGroup.groupName}")`
            : ""
        }`,
        notifyType: "info",
        student: studentId,
        additionalData: {
          studentName: `${user.firstName} ${user.lastName}`,
          newGroupName: group.groupName,
          oldGroupName: studentCurrentGroup?.groupName,
        },
      });
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
        .json({ success: true, message: "Вы еще не добавлены в группу" });
    }

    const group = await Group.findById(user.groupID)
      .populate({
        path: "students",
        select: "-testsHistory",
      })
      .populate("mentor");

    res.json({ success: true, group });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;

    // разрешённые поля
    const allowedFields = [
      "groupName",
      "groupDescribe",
      "groupTime",
      "groupDay",
    ];

    const updates = {};

    // берём только то, что пришло и разрешено
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Нет данных для обновления",
      });
    }

    const group = await Group.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true } // вернуть обновлённую группу
    );

    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "group not found" });
    }

    res.json({ success: true, group });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;

    const group = await Group.findById(id).populate("students");

    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "group not found" });
    }

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
  updateGroup,
  getGroupById,
};
