const Group = require("../groups/group.model");
const { User } = require("./user.model");

const getMe = async (req, res) => {
  try {
    const { id } = req.user;

    const user = await User.findById(id)
      .populate("groupID")
      .populate({
        path: "testsHistory",
        populate: {
          path: "test",
        },
      });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.groupID) {
      await Group.findByIdAndUpdate(user.groupID, {
        $pull: { students: user._id },
      });
    }

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  getMe,
  deleteUser,
};
