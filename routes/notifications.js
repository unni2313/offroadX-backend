const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const auth = require('../utils/verify-token');

// GET: Retrieve latest notifications
router.get('/', auth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const skip = parseInt(req.query.skip) || 0;

        const notifications = await Notification.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Notification.countDocuments();

        res.status(200).json({
            notifications,
            total,
            limit,
            skip
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// POST: Mark all notifications as read
router.post('/read-all', auth, async (req, res) => {
    try {
        const userId = req.user.id;

        // Add userId to readBy array for all notifications where it's not already present
        await Notification.updateMany(
            { readBy: { $ne: userId } },
            { $addToSet: { readBy: userId } }
        );

        res.status(200).json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
});

// POST: Mark notification as read
router.post('/:id/read', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { $addToSet: { readBy: userId } },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.status(200).json(notification);
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

module.exports = router;
