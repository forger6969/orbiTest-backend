const connectedUsers = new Map();
const connectedMentors = new Map();
const studentsInTest = new Map();

const Notify = require("../notification/notify.model");
const MentorNotify = require("../notification/mentorNotify.model");

// Вспомогательные функции
const notifyMentorsAboutStudentStatus = (userId, status, mentorsNamespace) => {
  try {
    console.log(`📢 Notifying mentors: Student ${userId} is ${status}`);
    mentorsNamespace.emit("studentStatus", {
      userId,
      status, // 'online' или 'offline'
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("❌ Error notifying mentors about student status:", error);
  }
};

const sendPendingNotifications = async (userId, socket) => {
  try {
    const pendingNotifications = await Notify.find({
      user: userId,
      status: "pending",
    }).sort({ createdAt: -1 });

    if (pendingNotifications.length > 0) {
      console.log(
        `📬 Sending ${pendingNotifications.length} pending notifications to user ${userId}`
      );
      pendingNotifications.forEach((notification) => {
        socket.emit("notification", notification);
      });
    }
  } catch (error) {
    console.error("❌ Error sending pending notifications:", error);
  }
};

const sendPendingMentorNotifications = async (mentorId, socket) => {
  try {
    const pendingNotifications = await MentorNotify.find({
      mentor: mentorId,
      status: "pending",
    })
      .populate("student", "firstName lastName grade")
      .populate("test", "testTitle")
      .sort({ createdAt: -1 });

    if (pendingNotifications.length > 0) {
      console.log(
        `📬 Sending ${pendingNotifications.length} pending notifications to mentor ${mentorId}`
      );
      pendingNotifications.forEach((notification) => {
        socket.emit("notification", notification);
      });
    }
  } catch (error) {
    console.error("❌ Error sending pending mentor notifications:", error);
  }
};

const sendOnlineStudentsList = async (mentorId, socket) => {
  try {
    const { User } = require("../user/user.model");
    const onlineStudentIds = Array.from(connectedUsers.keys());

    if (onlineStudentIds.length > 0) {
      const onlineStudents = await User.find({
        _id: { $in: onlineStudentIds },
      }).select("firstName lastName grade avatar");

      console.log(
        `📋 Sending ${onlineStudents.length} online students to mentor ${mentorId}`
      );
      socket.emit("onlineStudents", onlineStudents);
    }
  } catch (error) {
    console.error("❌ Error sending online students list:", error);
  }
};

const sendStudentsInTestList = async (mentorId, socket) => {
  try {
    const { User } = require("../user/user.model");
    const Test = require("../tests/test.model");

    const studentsInTestArray = [];

    for (const [studentId, testInfo] of studentsInTest.entries()) {
      try {
        const student = await User.findById(studentId).select(
          "firstName lastName grade avatar"
        );
        const test = await Test.findById(testInfo.testId).select("testTitle");

        if (student) {
          studentsInTestArray.push({
            studentId,
            studentData: student,
            testId: testInfo.testId,
            testTitle: test?.testTitle || testInfo.testTitle,
            startTime: testInfo.startTime,
          });
        }
      } catch (err) {
        console.error(`❌ Error fetching data for student ${studentId}:`, err);
      }
    }

    if (studentsInTestArray.length > 0) {
      console.log(
        `🎯 Sending ${studentsInTestArray.length} students in test to mentor ${mentorId}`
      );
      socket.emit("studentsInTest", studentsInTestArray);
    }
  } catch (error) {
    console.error("❌ Error sending students in test list:", error);
  }
};

function initSocket(io) {
  console.log("🚀 [SOCKET] Initializing socket with namespaces...");

  const studentsNamespace = io.of("/students");
  const mentorsNamespace = io.of("/mentors");

  console.log("✅ [SOCKET] Namespaces created successfully");

  // === СТУДЕНТЫ ===
  studentsNamespace.on("connection", (socket) => {
    console.log("👨‍🎓 [STUDENTS] Student socket connected:", socket.id);

    socket.on("register", async (userId) => {
      try {
        connectedUsers.set(userId.toString(), socket.id);
        console.log("✅ [STUDENTS] Student registered:", userId);

        notifyMentorsAboutStudentStatus(userId, "online", mentorsNamespace);
        await sendPendingNotifications(userId, socket);
      } catch (error) {
        console.error("❌ [STUDENTS] Error in register:", error);
      }
    });

    socket.on("startTest", async (data) => {
      try {
        const { userId, testId, testTitle } = data;
        console.log(`🎯 [STUDENTS] Student ${userId} started test ${testId}`);

        studentsInTest.set(userId.toString(), {
          testId,
          testTitle,
          startTime: new Date(),
          socketId: socket.id,
        });

        const { User } = require("../user/user.model");
        const student = await User.findById(userId).select(
          "firstName lastName grade avatar"
        );

        mentorsNamespace.emit("studentStartedTest", {
          studentId: userId,
          testId,
          testTitle,
          startTime: new Date(),
          studentData: student,
        });

        console.log(`✅ [STUDENTS] Notified mentors about test start`);
      } catch (error) {
        console.error("❌ [STUDENTS] Error in startTest:", error);
      }
    });

    socket.on("finishTest", async (data) => {
      try {
        const { userId, testId, score, successRate } = data;
        console.log(`✅ [STUDENTS] Student ${userId} finished test ${testId}`);

        studentsInTest.delete(userId.toString());

        mentorsNamespace.emit("studentFinishedTest", {
          studentId: userId,
          testId,
          score,
          successRate,
        });
      } catch (error) {
        console.error("❌ [STUDENTS] Error in finishTest:", error);
      }
    });

    socket.on("markAsViewed", async (notificationId) => {
      try {
        await Notify.findByIdAndUpdate(notificationId, { status: "viewed" });
        console.log(
          "✅ [STUDENTS] Notification marked as viewed:",
          notificationId
        );
      } catch (error) {
        console.error(
          "❌ [STUDENTS] Error marking notification as viewed:",
          error
        );
      }
    });

    socket.on("markAsViewedAll", async () => {
      try {
        await Notify;
      } catch (err) {
        console.error("Error markin all at view:", error);
      }
    });

    socket.on("disconnect", () => {
      try {
        for (const [userId, socketId] of connectedUsers.entries()) {
          if (socketId === socket.id) {
            connectedUsers.delete(userId);
            console.log("❌ [STUDENTS] Student disconnected:", userId);

            if (studentsInTest.has(userId)) {
              const testInfo = studentsInTest.get(userId);
              mentorsNamespace.emit("studentLeftTest", {
                studentId: userId,
                testId: testInfo.testId,
                reason: "disconnect",
              });
              studentsInTest.delete(userId);
            }

            notifyMentorsAboutStudentStatus(
              userId,
              "offline",
              mentorsNamespace
            );
            break;
          }
        }
      } catch (error) {
        console.error("❌ [STUDENTS] Error in disconnect:", error);
      }
    });
  });

  // === МЕНТОРЫ ===
  mentorsNamespace.on("connection", (socket) => {
    console.log("👨‍🏫 [MENTORS] Mentor socket connected:", socket.id);

    socket.on("register", async (mentorId) => {
      try {
        connectedMentors.set(mentorId.toString(), socket.id);
        console.log("✅ [MENTORS] Mentor registered:", mentorId);

        await sendOnlineStudentsList(mentorId, socket);
        await sendPendingMentorNotifications(mentorId, socket);
        await sendStudentsInTestList(mentorId, socket);
      } catch (error) {
        console.error("❌ [MENTORS] Error in register:", error);
      }
    });

    socket.on("markAsViewed", async (notificationId) => {
      try {
        await MentorNotify.findByIdAndUpdate(notificationId, {
          status: "viewed",
        });
        console.log(
          "✅ [MENTORS] Notification marked as viewed:",
          notificationId
        );
      } catch (error) {
        console.error(
          "❌ [MENTORS] Error marking notification as viewed:",
          error
        );
      }
    });

    socket.on("markAsViewedAll", async (userId, callback) => {
      try {
        console.log("[MENTOR] id:", userId);
        await MentorNotify.updateMany(
          { mentor: userId, status: "pending" },
          { $set: { status: "viewed" } }
        );

        const newNotifies = await MentorNotify.find({ mentor: userId }).sort({
          createdAt: -1,
        });

        callback(newNotifies); // возвращаем клиенту

        console.log("✅ All mentor notifications marked as viewed");
      } catch (err) {
        console.error("[MENTORS] error to mark all notifications", err);
        callback({ error: "Failed to mark notifications" });
      }
    });

    socket.on("disconnect", () => {
      try {
        for (const [mentorId, socketId] of connectedMentors.entries()) {
          if (socketId === socket.id) {
            connectedMentors.delete(mentorId);
            console.log("❌ [MENTORS] Mentor disconnected:", mentorId);
            break;
          }
        }
      } catch (error) {
        console.error("❌ [MENTORS] Error in disconnect:", error);
      }
    });
  });

  console.log("✅ [SOCKET] Socket namespaces initialized successfully");
}

module.exports = {
  initSocket,
  connectedUsers,
  connectedMentors,
  studentsInTest,
};
