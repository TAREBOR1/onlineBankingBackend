const Notification = require("../models/notification");


exports.createNotification = async ({
  userId,
  title,
  message,
  type = "system",
  metadata = {},
  session = null,
}) => {
  const payload = {
    userId,
    title,
    message,
    type,
    metadata,
  };

  // if inside transaction
  if (session) {
    return await Notification.create([payload], { session });
  }

  return await Notification.create(payload);
};