const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const User = require('../models/User');
const Registration = require('../models/Registration');
const jwt = require('jsonwebtoken');

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

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Failed to verify admin status' });
  }
};

// GET: Retrieve all events
router.get('/', async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 });
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

// POST: Create new event (Admin only)
router.post('/create', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const event = new Event(req.body);
    await event.save();
    res.status(201).json({ message: 'Event created successfully', event });
  } catch (error) {
    console.error('Error saving event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// PUT: Update event (Admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.status(200).json({ message: 'Event updated successfully', event });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// DELETE: Delete an event (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findByIdAndDelete(eventId);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Also delete all registrations for this event
    await Registration.deleteMany({ event: eventId });

    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// POST: Register for an event (creates pending registration)
router.post('/:id/register', authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.id;
    const { emergencyContact, medicalConditions, experienceLevel, additionalNotes, vehicles } = req.body;

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if event is upcoming
    if (event.status !== 'upcoming') {
      return res.status(400).json({ error: 'Cannot register for a non-upcoming event' });
    }

    // Check if user already has a registration for this event
    const existingRegistration = await Registration.findOne({ user: userId, event: eventId });
    if (existingRegistration) {
      return res.status(400).json({ 
        error: 'Already registered for this event',
        status: existingRegistration.status
      });
    }

    // Create new registration
    const registration = new Registration({
      user: userId,
      event: eventId,
      emergencyContact,
      medicalConditions,
      experienceLevel,
      additionalNotes,
      vehicles: vehicles || []
    });

    await registration.save();

    // Populate user details for response
    await registration.populate('user', 'firstName secondName email');

    res.status(201).json({ 
      message: 'Registration submitted successfully. Awaiting admin approval.',
      registration
    });
  } catch (error) {
    console.error('Error registering for event:', error);
    res.status(500).json({ error: 'Failed to register for event' });
  }
});

// POST: Cancel registration
router.post('/:id/cancel-registration', authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.id;

    const registration = await Registration.findOneAndDelete({ 
      user: userId, 
      event: eventId,
      status: { $in: ['pending', 'approved'] }
    });

    if (!registration) {
      return res.status(404).json({ error: 'No active registration found for this event' });
    }

    // If registration was approved, decrement participant count
    if (registration.status === 'approved') {
      await Event.findByIdAndUpdate(eventId, { $inc: { participants: -1 } });
    }

    res.status(200).json({ 
      message: 'Registration cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling registration:', error);
    res.status(500).json({ error: 'Failed to cancel registration' });
  }
});

// GET: Get user's registrations
router.get('/user/registrations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const registrations = await Registration.find({ user: userId })
      .populate('event')
      .populate('reviewedBy', 'firstName secondName')
      .sort({ appliedAt: -1 });

    res.status(200).json({
      message: 'User registrations retrieved successfully',
      registrations
    });
  } catch (error) {
    console.error('Error fetching user registrations:', error);
    res.status(500).json({ error: 'Failed to fetch user registrations' });
  }
});

// GET: Get user's approved participations (for backward compatibility)
router.get('/user/participations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const approvedRegistrations = await Registration.find({ 
      user: userId, 
      status: 'approved' 
    }).populate('event');

    const participations = approvedRegistrations.map(reg => reg.event._id);
    const events = approvedRegistrations.map(reg => reg.event);

    res.status(200).json({
      message: 'User participations retrieved successfully',
      participations,
      events
    });
  } catch (error) {
    console.error('Error fetching user participations:', error);
    res.status(500).json({ error: 'Failed to fetch user participations' });
  }
});

// GET: List registrations for an event (Admin only)
router.get('/:id/registrations', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const eventId = req.params.id;
    const { status } = req.query;

    const filter = { event: eventId };
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      filter.status = status;
    }

    const registrations = await Registration.find(filter)
      .populate('user', 'firstName secondName email phone')
      .populate('reviewedBy', 'firstName secondName')
      .populate('vehicles', 'make model year')
      .sort({ appliedAt: -1 });

    res.json({ 
      count: registrations.length, 
      registrations 
    });
  } catch (error) {
    console.error('Error fetching event registrations:', error);
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

// GET: List participants for an event (approved registrations only)
router.get('/:id/participants', authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.id;
    
    const approvedRegistrations = await Registration.find({ 
      event: eventId, 
      status: 'approved' 
    }).populate('user', 'firstName secondName email phone role');

    const participants = approvedRegistrations.map(reg => reg.user);

    res.json({ 
      count: participants.length, 
      participants 
    });
  } catch (error) {
    console.error('Error fetching event participants:', error);
    res.status(500).json({ error: 'Failed to fetch participants' });
  }
});

// POST: Approve registration (Admin only)
router.post('/registrations/:registrationId/approve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { reviewNotes } = req.body;
    const adminId = req.user.id;

    const registration = await Registration.findById(registrationId).populate('event');
    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    if (registration.status !== 'pending') {
      return res.status(400).json({ error: 'Registration is not pending' });
    }

    // Check if event is full
    const event = registration.event;
    if (event.participants >= event.maxParticipants) {
      return res.status(400).json({ error: 'Event is full' });
    }

    // Update registration
    registration.status = 'approved';
    registration.reviewedAt = new Date();
    registration.reviewedBy = adminId;
    registration.reviewNotes = reviewNotes;
    await registration.save();

    // Increment event participant count
    await Event.findByIdAndUpdate(event._id, { $inc: { participants: 1 } });

    await registration.populate('user', 'firstName secondName email');

    res.status(200).json({ 
      message: 'Registration approved successfully',
      registration
    });
  } catch (error) {
    console.error('Error approving registration:', error);
    res.status(500).json({ error: 'Failed to approve registration' });
  }
});

// POST: Reject registration (Admin only)
router.post('/registrations/:registrationId/reject', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { reviewNotes } = req.body;
    const adminId = req.user.id;

    const registration = await Registration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    if (registration.status !== 'pending') {
      return res.status(400).json({ error: 'Registration is not pending' });
    }

    // Update registration
    registration.status = 'rejected';
    registration.reviewedAt = new Date();
    registration.reviewedBy = adminId;
    registration.reviewNotes = reviewNotes;
    await registration.save();

    await registration.populate('user', 'firstName secondName email');

    res.status(200).json({ 
      message: 'Registration rejected',
      registration
    });
  } catch (error) {
    console.error('Error rejecting registration:', error);
    res.status(500).json({ error: 'Failed to reject registration' });
  }
});

// GET: Get all pending registrations (Admin only)
router.get('/admin/pending-registrations', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const pendingRegistrations = await Registration.find({ status: 'pending' })
      .populate('user', 'firstName secondName email phone')
      .populate('event', 'name date location')
      .populate('vehicles', 'make model year')
      .sort({ appliedAt: -1 });

    res.json({ 
      count: pendingRegistrations.length, 
      registrations: pendingRegistrations 
    });
  } catch (error) {
    console.error('Error fetching pending registrations:', error);
    res.status(500).json({ error: 'Failed to fetch pending registrations' });
  }
});

module.exports = router;