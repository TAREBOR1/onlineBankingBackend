const express = require("express");

const { userProtect } = require("../middlewares/auth");
const { markAllAsRead, markAsRead, getMyNotifications } = require("../controllers/notification");


const notificationRoute = express.Router();

notificationRoute.get("/getNotifications", userProtect, getMyNotifications);

notificationRoute.patch("/:notificationId/read",userProtect,markAsRead);

notificationRoute.patch( "/read-all",userProtect,markAllAsRead);


module.exports = notificationRoute ;