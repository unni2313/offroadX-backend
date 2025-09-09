// server/events.js
const express = require('express');
const router = express.Router();
const Event = require('./models/Event'); // ✅ Import model
const User = require('./models/User'); // ✅ Import User model
const jwt = require('jsonwebtoken'); // ✅ For token verification

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, 'mudichidallamaa', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// GET: Retrieve all events
router.get('/', async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 }); // Sort by date ascending
    res.status(200).json({
      message: 'Events retrieved successfully',
      events,
      count: events.length
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to retrieve events' });
  }
});

// GET: Retrieve a specific event by ID
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.status(200).json({ message: 'Event retrieved successfully', event });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to retrieve event' });
  }
});

// POST: Create new event
router.post('/create', async (req, res) => {
  try {
    const event = new Event(req.body);
    await event.save();
    res.status(201).json({ message: 'Event created successfully', event });
  } catch (error) {
    console.error('Error saving event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// DELETE: Delete an event by ID
router.delete('/:id', async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findByIdAndDelete(eventId);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// POST: Join an event
router.post('/:id/join', authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.id;

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if event is upcoming
    if (event.status !== 'upcoming') {
      return res.status(400).json({ error: 'Cannot join a non-upcoming event' });
    }

    // Check if event is full
    if (event.participants >= event.maxParticipants) {
      return res.status(400).json({ error: 'Event is full' });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is already registered
    if (!user.eventParticipations) {
      user.eventParticipations = [];
    }

    if (user.eventParticipations.includes(eventId)) {
      return res.status(400).json({ error: 'Already registered for this event' });
    }

    // Add user to event participants
    user.eventParticipations.push(eventId);
    await user.save();

    // Increment event participant count
    event.participants += 1;
    await event.save();

    res.status(200).json({ 
      message: 'Successfully joined the event',
      event: event
    });
  } catch (error) {
    console.error('Error joining event:', error);
    res.status(500).json({ error: 'Failed to join event' });
  }
});

// POST: Leave an event
router.post('/:id/leave', authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.id;

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is registered for this event
    if (!user.eventParticipations || !user.eventParticipations.includes(eventId)) {
      return res.status(400).json({ error: 'Not registered for this event' });
    }

    // Remove user from event participants
    user.eventParticipations = user.eventParticipations.filter(id => id.toString() !== eventId);
    await user.save();

    // Decrement event participant count
    event.participants = Math.max(0, event.participants - 1);
    await event.save();

    res.status(200).json({ 
      message: 'Successfully left the event',
      event: event
    });
  } catch (error) {
    console.error('Error leaving event:', error);
    res.status(500).json({ error: 'Failed to leave event' });
  }
});

// GET: Get user's event participations
router.get('/user/participations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const participations = user.eventParticipations || [];
    
    // Get full event details for user's participations
    const events = await Event.find({ _id: { $in: participations } });

    res.status(200).json({
      message: 'User participations retrieved successfully',
      participations: participations,
      events: events
    });
  } catch (error) {
    console.error('Error fetching user participations:', error);
    res.status(500).json({ error: 'Failed to fetch user participations' });
  }
});

// GET: List participants for an event
router.get('/:id/participants', authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.id;
    const users = await User.find({ eventParticipations: eventId })
      .select('firstName secondName email phone role');
    return res.json({ count: users.length, participants: users });
  } catch (error) {
    console.error('Error fetching event participants:', error);
    res.status(500).json({ error: 'Failed to fetch participants' });
  }
});

module.exports = router;
