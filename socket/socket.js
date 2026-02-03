const connectedUsers = new Map(); // userId -> socketId
const connectedMentors = new Map(); // mentorId -> socketId
const studentsInTest = new Map(); // studentId -> { testId, testTitle, startTime }

const Notify = require("../notification/notify.model");
const MentorNotify = require("../notification/mentorNotify.model");

// ... существующие функции ...

function initSocket(io) {
  console.log("Initializing socket with namespaces...");

  const studentsNamespace = io.of("/students");
  const mentorsNamespace = io.of("/mentors");

  // === СТУДЕНТЫ ===
  studentsNamespace.on("connection", (socket) => {
    console.log("Student socket connected:", socket.id);

    socket.on("register", (userId) => {
      connectedUsers.set(userId.toString(), socket.id);
      console.log("Student registered:", userId);
      notifyMentorsAboutStudentStatus(userId, "online", mentorsNamespace);
      sendPendingNotifications(userId, socket);
    });

    // НОВОЕ: Студент начал тест
    socket.on("startTest", async (data) => {
      const { userId, testId, testTitle } = data;
      console.log(`Student ${userId} started test ${testId}`);

      // Сохраняем информацию
      studentsInTest.set(userId.toString(), {
        testId,
        testTitle,
        startTime: new Date(),
        socketId: socket.id,
      });

      // Получаем данные студента
      try {
        const { User } = require("../user/user.model");
        const student = await User.findById(userId).select(
          "firstName lastName grade avatar"
        );

        // Уведомляем всех менторов
        mentorsNamespace.emit("studentStartedTest", {
          studentId: userId,
          testId,
          testTitle,
          startTime: new Date(),
          studentData: student,
        });
      } catch (error) {
        console.error("Error notifying mentors about test start:", error);
      }
    });

    // НОВОЕ: Студент закончил тест
    socket.on("finishTest", async (data) => {
      const { userId, testId, score, successRate } = data;
      console.log(`Student ${userId} finished test ${testId}`);

      // Удаляем из списка
      studentsInTest.delete(userId.toString());

      // Уведомляем менторов
      mentorsNamespace.emit("studentFinishedTest", {
        studentId: userId,
        testId,
        score,
        successRate,
      });
    });

    socket.on("markAsViewed", async (notificationId) => {
      try {
        await Notify.findByIdAndUpdate(notificationId, { status: "viewed" });
        console.log("Notification marked as viewed:", notificationId);
      } catch (error) {
        console.error("Error marking notification as viewed:", error);
      }
    });

    socket.on("disconnect", () => {
      for (const [userId, socketId] of connectedUsers.entries()) {
        if (socketId === socket.id) {
          connectedUsers.delete(userId);
          console.log("Student disconnected:", userId);

          // Если студент был в тесте - уведомляем о выходе
          if (studentsInTest.has(userId)) {
            const testInfo = studentsInTest.get(userId);
            mentorsNamespace.emit("studentLeftTest", {
              studentId: userId,
              testId: testInfo.testId,
              reason: "disconnect",
            });
            studentsInTest.delete(userId);
          }

          notifyMentorsAboutStudentStatus(userId, "offline", mentorsNamespace);
          break;
        }
      }
    });
  });

  // === МЕНТОРЫ ===
  mentorsNamespace.on("connection", (socket) => {
    console.log("Mentor socket connected:", socket.id);

    socket.on("register", async (mentorId) => {
      connectedMentors.set(mentorId.toString(), socket.id);
      console.log("Mentor registered:", mentorId);

      await sendOnlineStudentsList(mentorId, socket);
      await sendPendingMentorNotifications(mentorId, socket);

      // НОВОЕ: Отправляем список студентов в тесте
      await sendStudentsInTestList(mentorId, socket);
    });

    socket.on("markAsViewed", async (notificationId) => {
      try {
        await MentorNotify.findByIdAndUpdate(notificationId, {
          status: "viewed",
        });
        console.log("Mentor notification marked as viewed:", notificationId);
      } catch (error) {
        console.error("Error marking mentor notification as viewed:", error);
      }
    });

    socket.on("disconnect", () => {
      for (const [mentorId, socketId] of connectedMentors.entries()) {
        if (socketId === socket.id) {
          connectedMentors.delete(mentorId);
          console.log("Mentor disconnected:", mentorId);
          break;
        }
      }
    });
  });

  console.log("Socket namespaces initialized successfully");
}

// НОВАЯ ФУНКЦИЯ: Отправка списка студентов в тесте
const sendStudentsInTestList = async (mentorId, socket) => {
  try {
    const { User } = require("../user/user.model");
    const Test = require("../tests/test.model");

    const studentsInTestArray = [];

    for (const [studentId, testInfo] of studentsInTest.entries()) {
      const student = await User.findById(studentId).select(
        "firstName lastName grade avatar"
      );
      const test = await Test.findById(testInfo.testId).select("testTitle");

      studentsInTestArray.push({
        studentId,
        studentData: student,
        testId: testInfo.testId,
        testTitle: test?.testTitle || testInfo.testTitle,
        startTime: testInfo.startTime,
      });
    }

    socket.emit("studentsInTest", studentsInTestArray);
  } catch (error) {
    console.error("Error sending students in test list:", error);
  }
};

module.exports = {
  initSocket,
  connectedUsers,
  connectedMentors,
  studentsInTest, // экспортируем для доступа из других модулей
};
