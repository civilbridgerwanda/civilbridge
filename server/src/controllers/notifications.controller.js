import { Notification } from "../models/index.js";

// GET /api/notifications
export async function list(req, res) {
  try {
    const notifications = await Notification.findAll({
      where: { user_id: req.user.sub },
      order: [["created_at", "DESC"]],
      limit: 50,
    });
    const unreadCount = await Notification.count({ where: { user_id: req.user.sub, is_read: false } });
    res.json({ success: true, data: { notifications, unreadCount } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch notifications" });
  }
}

// PATCH /api/notifications/:id/read
export async function markRead(req, res) {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, user_id: req.user.sub },
    });
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    notification.is_read = true;
    await notification.save();
    res.json({ success: true, data: notification });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to update notification" });
  }
}

// PATCH /api/notifications/read-all
export async function markAllRead(req, res) {
  try {
    await Notification.update({ is_read: true }, { where: { user_id: req.user.sub, is_read: false } });
    res.json({ success: true, data: { done: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to update notifications" });
  }
}
