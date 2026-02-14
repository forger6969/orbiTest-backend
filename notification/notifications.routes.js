// routes/notification.routes.js
const express = require("express");
const router = express.Router();
const {
  tokenMiddleware,
  mentorMiddleware,
} = require("../middlewares/auth.middleware");
const Notify = require("../notification/notify.model");
const MentorNotify = require("../notification/mentorNotify.model");

// ============ STUDENT NOTIFICATIONS ============

/**
 * GET /api/notifications/user/:userId
 * Получить все уведомления студента
 */
router.get("/user/:userId", tokenMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query; // optional: 'pending' или 'viewed'

    // Проверка прав доступа
    if (req.user.id !== userId) {
      return res
        .status(403)
        .json({ message: "Нет доступа к этим уведомлениям" });
    }

    const query = { user: userId };
    if (status) {
      query.status = status;
    }

    const notifications = await Notify.find(query)
      .populate("mentor", "firstName lastName")
      .populate("test", "testTitle")
      .populate("exam", "examTitle")
      .sort({ createdAt: -1 })
      .limit(100); // Ограничиваем 100 последними

    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Ошибка получения уведомлений", error });
  }
});

/**
 * GET /api/notifications/user/:userId/unread-count
 * Получить количество непрочитанных уведомлений
 */
router.get("/user/:userId/unread-count", tokenMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    // Проверка прав доступа
    if (req.user.id !== userId) {
      return res
        .status(403)
        .json({ message: "Нет доступа к этим уведомлениям" });
    }

    const count = await Notify.countDocuments({
      user: userId,
      status: "pending",
    });

    res.json({ count });
  } catch (error) {
    console.error("Error counting unread notifications:", error);
    res.status(500).json({ message: "Ошибка подсчета уведомлений", error });
  }
});

/**
 * GET /api/notifications/my
 * Получить все уведомления текущего студента
 */
router.get("/my", tokenMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const query = { user: userId };
    if (status) {
      query.status = status;
    }

    const notifications = await Notify.find(query)
      .populate("mentor", "firstName lastName")
      .populate("test", "testTitle")
      .populate("exam", "examTitle")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(notifications);
  } catch (error) {
    console.error("Error fetching my notifications:", error);
    res.status(500).json({ message: "Ошибка получения уведомлений", error });
  }
});

/**
 * GET /api/notifications/my/unread-count
 * Получить количество непрочитанных уведомлений текущего студента
 */
router.get("/my/unread-count", tokenMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await Notify.countDocuments({
      user: userId,
      status: "pending",
    });

    res.json({ count });
  } catch (error) {
    console.error("Error counting my unread notifications:", error);
    res.status(500).json({ message: "Ошибка подсчета уведомлений", error });
  }
});

/**
 * GET /api/notifications/:notificationId
 * Получить одно уведомление по ID
 */
router.get("/:notificationId", tokenMiddleware, async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notify.findById(notificationId)
      .populate("mentor", "firstName lastName")
      .populate("test", "testTitle")
      .populate("exam", "examTitle");

    if (!notification) {
      return res.status(404).json({ message: "Уведомление не найдено" });
    }

    // Проверка прав доступа
    if (notification.user.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Нет доступа к этому уведомлению" });
    }

    res.json(notification);
  } catch (error) {
    console.error("Error fetching notification:", error);
    res.status(500).json({ message: "Ошибка получения уведомления", error });
  }
});

/**
 * PATCH /api/notifications/:notificationId/view
 * Пометить уведомление как прочитанное
 */
router.patch("/:notificationId/view", tokenMiddleware, async (req, res) => {
  try {
    const { notificationId } = req.params;

    // Сначала найдём уведомление для проверки прав
    const notification = await Notify.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ message: "Уведомление не найдено" });
    }

    // Проверка прав доступа
    if (notification.user.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Нет доступа к этому уведомлению" });
    }

    notification.status = "viewed";
    await notification.save();

    res.json(notification);
  } catch (error) {
    console.error("Error marking notification as viewed:", error);
    res.status(500).json({ message: "Ошибка обновления уведомления", error });
  }
});

/**
 * PATCH /api/notifications/user/:userId/view-all
 * Пометить все уведомления студента как прочитанные
 */
router.patch("/user/:userId/view-all", tokenMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    // Проверка прав доступа
    if (req.user.id !== userId) {
      return res
        .status(403)
        .json({ message: "Нет доступа к этим уведомлениям" });
    }

    const result = await Notify.updateMany(
      { user: userId, status: "pending" },
      { status: "viewed" }
    );

    res.json({
      message: "Все уведомления помечены как прочитанные",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error marking all notifications as viewed:", error);
    res.status(500).json({ message: "Ошибка обновления уведомлений", error });
  }
});

/**
 * PATCH /api/notifications/my/view-all
 * Пометить все уведомления текущего студента как прочитанные
 */
router.patch("/my/view-all", tokenMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await Notify.updateMany(
      { user: userId, status: "pending" },
      { status: "viewed" }
    );

    res.json({
      message: "Все уведомления помечены как прочитанные",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error marking all notifications as viewed:", error);
    res.status(500).json({ message: "Ошибка обновления уведомлений", error });
  }
});

/**
 * DELETE /api/notifications/:notificationId
 * Удалить одно уведомление
 */
router.delete("/:notificationId", tokenMiddleware, async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notify.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ message: "Уведомление не найдено" });
    }

    // Проверка прав доступа
    if (notification.user.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Нет доступа к этому уведомлению" });
    }

    await Notify.findByIdAndDelete(notificationId);

    res.json({ message: "Уведомление удалено", notification });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ message: "Ошибка удаления уведомления", error });
  }
});

/**
 * DELETE /api/notifications/user/:userId/viewed
 * Удалить все прочитанные уведомления студента
 */
router.delete("/user/:userId/viewed", tokenMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    // Проверка прав доступа
    if (req.user.id !== userId) {
      return res
        .status(403)
        .json({ message: "Нет доступа к этим уведомлениям" });
    }

    const result = await Notify.deleteMany({
      user: userId,
      status: "viewed",
    });

    res.json({
      message: "Прочитанные уведомления удалены",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting viewed notifications:", error);
    res.status(500).json({ message: "Ошибка удаления уведомлений", error });
  }
});

/**
 * DELETE /api/notifications/my/viewed
 * Удалить все прочитанные уведомления текущего студента
 */
router.delete("/my/viewed", tokenMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await Notify.deleteMany({
      user: userId,
      status: "viewed",
    });

    res.json({
      message: "Прочитанные уведомления удалены",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting viewed notifications:", error);
    res.status(500).json({ message: "Ошибка удаления уведомлений", error });
  }
});

/**
 * DELETE /api/notifications/user/:userId/all
 * Удалить все уведомления студента
 */
router.delete("/user/:userId/all", tokenMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    // Проверка прав доступа
    if (req.user.id !== userId) {
      return res
        .status(403)
        .json({ message: "Нет доступа к этим уведомлениям" });
    }

    const result = await Notify.deleteMany({ user: userId });

    res.json({
      message: "Все уведомления удалены",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting all notifications:", error);
    res.status(500).json({ message: "Ошибка удаления уведомлений", error });
  }
});

// ============ MENTOR NOTIFICATIONS ============

/**
 * GET /api/notifications/mentor/my
 * Получить все уведомления текущего ментора
 */
router.get("/mentor/my", mentorMiddleware, async (req, res) => {
  try {
    const mentorId = req.user.id;
    const { status } = req.query;

    const query = { mentor: mentorId };
    if (status) {
      query.status = status;
    }

    const notifications = await MentorNotify.find(query)
      .populate("student", "firstName lastName grade avatar")
      .populate("test", "testTitle")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(notifications);
  } catch (error) {
    console.error("Error fetching mentor notifications:", error);
    res.status(500).json({ message: "Ошибка получения уведомлений", error });
  }
});

/**
 * GET /api/notifications/mentor/my/unread-count
 * Получить количество непрочитанных уведомлений текущего ментора
 */
router.get("/mentor/my/unread-count", mentorMiddleware, async (req, res) => {
  try {
    const mentorId = req.user.id;

    const count = await MentorNotify.countDocuments({
      mentor: mentorId,
      status: "pending",
    });

    res.json({ count });
  } catch (error) {
    console.error("Error counting mentor unread notifications:", error);
    res.status(500).json({ message: "Ошибка подсчета уведомлений", error });
  }
});

/**
 * GET /api/notifications/mentor/:mentorId
 * Получить все уведомления ментора
 */
router.get("/mentor/:mentorId", mentorMiddleware, async (req, res) => {
  try {
    const { mentorId } = req.params;
    const { status } = req.query;

    // Проверка прав доступа
    if (req.user.id !== mentorId) {
      return res
        .status(403)
        .json({ message: "Нет доступа к этим уведомлениям" });
    }

    const query = { mentor: mentorId };
    if (status) {
      query.status = status;
    }

    const notifications = await MentorNotify.find(query)
      .populate("student", "firstName lastName grade avatar")
      .populate("test", "testTitle")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(notifications);
  } catch (error) {
    console.error("Error fetching mentor notifications:", error);
    res.status(500).json({ message: "Ошибка получения уведомлений", error });
  }
});

/**
 * GET /api/notifications/mentor/:mentorId/unread-count
 * Получить количество непрочитанных уведомлений ментора
 */
router.get(
  "/mentor/:mentorId/unread-count",
  mentorMiddleware,
  async (req, res) => {
    try {
      const { mentorId } = req.params;

      // Проверка прав доступа
      if (req.user.id !== mentorId) {
        return res
          .status(403)
          .json({ message: "Нет доступа к этим уведомлениям" });
      }

      const count = await MentorNotify.countDocuments({
        mentor: mentorId,
        status: "pending",
      });

      res.json({ count });
    } catch (error) {
      console.error("Error counting mentor unread notifications:", error);
      res.status(500).json({ message: "Ошибка подсчета уведомлений", error });
    }
  }
);

/**
 * PATCH /api/notifications/mentor/:notificationId/view
 * Пометить уведомление ментора как прочитанное
 */
router.patch(
  "/mentor/:notificationId/view",
  mentorMiddleware,
  async (req, res) => {
    try {
      const { notificationId } = req.params;

      const notification = await MentorNotify.findById(notificationId);

      if (!notification) {
        return res.status(404).json({ message: "Уведомление не найдено" });
      }

      // Проверка прав доступа
      if (notification.mentor.toString() !== req.user.id) {
        return res
          .status(403)
          .json({ message: "Нет доступа к этому уведомлению" });
      }

      notification.status = "viewed";
      await notification.save();

      res.json(notification);
    } catch (error) {
      console.error("Error marking mentor notification as viewed:", error);
      res.status(500).json({ message: "Ошибка обновления уведомления", error });
    }
  }
);

/**
 * PATCH /api/notifications/mentor/:mentorId/view-all
 * Пометить все уведомления ментора как прочитанные
 */
router.patch(
  "/mentor/:mentorId/view-all",
  mentorMiddleware,
  async (req, res) => {
    try {
      const { mentorId } = req.params;

      // Проверка прав доступа
      if (req.user.id !== mentorId) {
        return res
          .status(403)
          .json({ message: "Нет доступа к этим уведомлениям" });
      }

      const result = await MentorNotify.updateMany(
        { mentor: mentorId, status: "pending" },
        { status: "viewed" }
      );

      res.json({
        message: "Все уведомления помечены как прочитанные",
        modifiedCount: result.modifiedCount,
      });
    } catch (error) {
      console.error("Error marking all mentor notifications as viewed:", error);
      res.status(500).json({ message: "Ошибка обновления уведомлений", error });
    }
  }
);

/**
 * PATCH /api/notifications/mentor/my/view-all
 * Пометить все уведомления текущего ментора как прочитанные
 */
router.patch("/mentor/my/view-all", mentorMiddleware, async (req, res) => {
  try {
    const mentorId = req.user.id;

    const result = await MentorNotify.updateMany(
      { mentor: mentorId, status: "pending" },
      { status: "viewed" }
    );

    res.json({
      message: "Все уведомления помечены как прочитанные",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error marking all mentor notifications as viewed:", error);
    res.status(500).json({ message: "Ошибка обновления уведомлений", error });
  }
});

/**
 * DELETE /api/notifications/mentor/:notificationId
 * Удалить уведомление ментора
 */
router.delete("/mentor/:notificationId", mentorMiddleware, async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await MentorNotify.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ message: "Уведомление не найдено" });
    }

    // Проверка прав доступа
    if (notification.mentor.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Нет доступа к этому уведомлению" });
    }

    await MentorNotify.findByIdAndDelete(notificationId);

    res.json({ message: "Уведомление удалено", notification });
  } catch (error) {
    console.error("Error deleting mentor notification:", error);
    res.status(500).json({ message: "Ошибка удаления уведомления", error });
  }
});

/**
 * DELETE /api/notifications/mentor/:mentorId/viewed
 * Удалить все прочитанные уведомления ментора
 */
router.delete(
  "/mentor/:mentorId/viewed",
  mentorMiddleware,
  async (req, res) => {
    try {
      const { mentorId } = req.params;

      // Проверка прав доступа
      if (req.user.id !== mentorId) {
        return res
          .status(403)
          .json({ message: "Нет доступа к этим уведомлениям" });
      }

      const result = await MentorNotify.deleteMany({
        mentor: mentorId,
        status: "viewed",
      });

      res.json({
        message: "Прочитанные уведомления удалены",
        deletedCount: result.deletedCount,
      });
    } catch (error) {
      console.error("Error deleting mentor viewed notifications:", error);
      res.status(500).json({ message: "Ошибка удаления уведомлений", error });
    }
  }
);

/**
 * DELETE /api/notifications/mentor/my/viewed
 * Удалить все прочитанные уведомления текущего ментора
 */
router.delete("/mentor/my/viewed", mentorMiddleware, async (req, res) => {
  try {
    const mentorId = req.user.id;

    const result = await MentorNotify.deleteMany({
      mentor: mentorId,
      status: "viewed",
    });

    res.json({
      message: "Прочитанные уведомления удалены",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting mentor viewed notifications:", error);
    res.status(500).json({ message: "Ошибка удаления уведомлений", error });
  }
});

module.exports = router;
