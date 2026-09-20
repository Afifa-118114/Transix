const asyncHandler = require("../middleware/asyncHandler");
const Notification = require("../models/Notification");
const TripMessage = require("../models/TripMessage");
const AppError = require("../utils/AppError");

// Get all notifications for the authenticated user
const getUserNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;

  const notifications = await Notification.find({ recipientId: userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("tripId", "destination source organizationDetails tripCategory status startDate endDate")
    .populate("messageId", "message subject senderRole createdAt readAt")
    .populate("vendorRequestId")
    .populate("vendorId", "name status fleet")
    .populate("senderId", "name email role");

  const unreadCount = await Notification.countDocuments({
    recipientId: userId,
    read: false,
  });

  res.status(200).json({
    success: true,
    notifications,
    unreadCount,
  });
});

// Get unread notification count
const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;

  const unreadCount = await Notification.countDocuments({
    recipientId: userId,
    read: false,
  });

  res.status(200).json({
    success: true,
    unreadCount,
  });
});

// Mark a specific notification as read
const markNotificationRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id || req.user.id;

  const notification = await Notification.findOne({
    _id: id,
    recipientId: userId,
  });

  if (!notification) {
    throw new AppError("Notification not found", 404);
  }

  if (!notification.read) {
    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    // Also mark the corresponding message as read if applicable
    if (notification.messageId) {
      await TripMessage.findByIdAndUpdate(notification.messageId, {
        $set: { readAt: new Date(), status: "READ" },
      });
    }
  }

  res.status(200).json({
    success: true,
    notification,
  });
});

// Mark all notifications for the user as read
const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;

  const result = await Notification.updateMany(
    {
      recipientId: userId,
      read: false,
    },
    {
      $set: {
        read: true,
        readAt: new Date(),
      },
    }
  );

  res.status(200).json({
    success: true,
    markedCount: result.modifiedCount,
  });
});

module.exports = {
  getUserNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
};
