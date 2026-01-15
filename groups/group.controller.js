const { User } = require("../user/user.model");
const Group = require("./group.model");

const createGroup = async (req, res) => {
  try {
    const { groupName, groupDescribe, groupTime, groupDay } = req.body;

    if (!groupName || !groupDescribe || !groupTime || !groupDay) {
      return res
        .status(400)
        .json({ success: false, message: "add required fileds" });
    }

    const group = new Group({ groupName, groupDescribe, groupTime, groupDay });
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

    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      {
        $addToSet: { students: studentId },
      },
      {
        new: true,
      }
    );

    if (!updatedGroup) {
      return res
        .status(404)
        .json({ success: false, message: "group not found" });
    }

    res.json({success:true , updatedGroup})
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createGroup,
  addStudentToGroup
};
