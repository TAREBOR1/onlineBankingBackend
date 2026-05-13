const Notification = require("../models/notification");



// ==========================
// GET USER NOTIFICATIONS
// ==========================
exports.getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      notifications,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ==========================
// MARK AS READ (single)
// ==========================
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    const notification = await Notification.findOne({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    notification.isRead = true;
    await notification.save();

    res.json({
      success: true,
      message: "Marked as read",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ==========================
// MARK ALL AS READ
// ==========================
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ==========================
// CREATE NOTIFICATION (internal use)
// ==========================
exports.createNotification = async ({
  userId,
  title,
  message,
  type = "system",
  metadata = {},
}) => {
  return await Notification.create({
    userId,
    title,
    message,
    type,
    metadata,
  });
};