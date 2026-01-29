const express = require('express');
const router = express.Router();
const Event = require('./models/Event');
const User = require('./models/User');
const Registration = require('./models/Registration');
const Race = require('./models/Race');
const Result = require('./models/Result');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'mudichidallamaa', (err, user) => {
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

// GET: Retrieve upcoming events (must come before /:id route)
router.get('/upcoming', authenticateToken, async (req, res) => {
  try {
    // Get today's date as a string in YYYY-MM-DD format
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];

    // Find events with date >= today and status = 'upcoming'
    // Since dates are stored as strings, we do string comparison
    const upcomingEvents = await Event.find({
      date: { $gte: todayString },
      status: 'upcoming'
    }).sort({ date: 1 });

    res.status(200).json({
      message: 'Upcoming events retrieved successfully',
      events: upcomingEvents,
      count: upcomingEvents.length
    });
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({ error: 'Failed to retrieve upcoming events' });
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
    const { emergencyContact, medicalConditions, experienceLevel, additionalNotes, vehicles, races, vehiclesByRace } = req.body;

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if event is upcoming
    if (event.status !== 'upcoming') {
      return res.status(400).json({ error: 'Cannot register for a non-upcoming event' });
    }

    // Validate races: must be a non-empty array of race IDs belonging to this event
    if (!Array.isArray(races) || races.length === 0) {
      return res.status(400).json({ error: 'At least one race must be selected' });
    }

    // Fetch and validate that all provided races exist and belong to the event
    const uniqueRaceIds = [...new Set(races.map(String))];
    const foundRaces = await Race.find({ _id: { $in: uniqueRaceIds }, event: eventId });
    if (foundRaces.length !== uniqueRaceIds.length) {
      return res.status(400).json({ error: 'One or more selected races are invalid for this event' });
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
      races: uniqueRaceIds,
      emergencyContact,
      medicalConditions,
      experienceLevel,
      additionalNotes,
      vehicles: vehicles || [],
      vehiclesByRace: vehiclesByRace || {}
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
      .populate('vehicles', 'make model year registrationNumber')
      .populate('races', 'name type date startTime')
      .populate('vehiclesByRace')
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

// GET: Get results for a specific race (Admin only)
router.get('/:eventId/races/:raceId/results', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { eventId, raceId } = req.params;

    console.log('=== FETCH RESULTS DEBUG ===');
    console.log('EventId:', eventId);
    console.log('RaceId:', raceId);

    const results = await Result.find({ event: eventId, race: raceId })
      .populate('user', 'firstName secondName')
      .populate('vehicle', 'make model year')
      .populate('registration', 'status')
      .sort({ position: 1 });

    console.log('Found results:', results.length);
    console.log('Results:', results.map(r => ({ user: r.user?.firstName, score: r.score, position: r.position })));

    res.json({ results });
  } catch (error) {
    console.error('Error fetching race results:', error);
    res.status(500).json({ error: 'Failed to fetch race results' });
  }
});

// POST: Save/update result for a race participant (Admin only)
router.post('/:eventId/races/:raceId/results', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { eventId, raceId } = req.params;
    const { registrationId, userId, vehicleId, score, finishingTimeMs, position, notes } = req.body;

    console.log('=== SAVE RESULT DEBUG ===');
    console.log('EventId:', eventId);
    console.log('RaceId:', raceId);
    console.log('Payload:', { registrationId, userId, vehicleId, score, finishingTimeMs, position, notes });

    // Validate required fields
    if (!registrationId || !userId) {
      console.log('ERROR: Missing registrationId or userId');
      return res.status(400).json({ error: 'Registration ID and User ID are required' });
    }

    // Verify the registration exists and belongs to this event/race
    const registration = await Registration.findById(registrationId)
      .populate('races');

    console.log('Found registration:', registration ? 'YES' : 'NO');
    if (registration) {
      console.log('Registration event:', registration.event);
      console.log('Registration races:', registration.races.map(r => r._id));
    }

    if (!registration) {
      console.log('ERROR: Registration not found');
      return res.status(404).json({ error: 'Registration not found' });
    }

    if (registration.event.toString() !== eventId) {
      console.log('ERROR: Registration does not belong to this event');
      return res.status(400).json({ error: 'Registration does not belong to this event' });
    }

    if (!registration.races.some(race => race._id.toString() === raceId)) {
      console.log('ERROR: User is not registered for this race');
      return res.status(400).json({ error: 'User is not registered for this race' });
    }

    // Upsert the result
    const resultData = {
      event: eventId,
      race: raceId,
      registration: registrationId,
      user: userId,
      score: score || 0,
      finishingTimeMs: finishingTimeMs || 0,
      position: position || null,
      notes: notes || ''
    };

    if (vehicleId) {
      resultData.vehicle = vehicleId;
    }

    const result = await Result.findOneAndUpdate(
      { event: eventId, race: raceId, user: userId },
      resultData,
      { upsert: true, new: true }
    ).populate('user', 'firstName secondName')
      .populate('vehicle', 'make model year');

    console.log('Result saved:', result ? 'YES' : 'NO');
    if (result) {
      console.log('Result ID:', result._id);
      console.log('Result data:', { score: result.score, finishingTimeMs: result.finishingTimeMs, position: result.position });
    }

    // Broadcast to SSE clients
    if (global.resultStreams) {
      const broadcastData = JSON.stringify({ event: 'result_saved', result });
      global.resultStreams.forEach(stream => {
        try {
          stream.write(`data: ${broadcastData}\n\n`);
        } catch (err) {
          // Remove dead connections
          const index = global.resultStreams.indexOf(stream);
          if (index > -1) {
            global.resultStreams.splice(index, 1);
          }
        }
      });
    }

    res.json({
      message: 'Result saved successfully',
      result
    });
  } catch (error) {
    console.error('Error saving result:', error);
    res.status(500).json({ error: 'Failed to save result' });
  }
});

// GET: Get all results (with optional filtering)
router.get('/results', authenticateToken, async (req, res) => {
  try {
    const { mineOnly } = req.query;
    const userId = req.user.id;

    let filter = {};
    if (mineOnly === 'true') {
      filter.user = userId;
    }

    const results = await Result.find(filter)
      .populate('event', 'name date')
      .populate('race', 'name date startTime')
      .populate('user', 'firstName secondName')
      .populate('vehicle', 'make model year')
      .sort({ 'event.date': -1, 'race.date': -1, position: 1 });

    res.json({ results });
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// GET: SSE stream for result updates
router.get('/results/stream', authenticateToken, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ event: 'connected' })}\n\n`);

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(`data: ${JSON.stringify({ event: 'ping' })}\n\n`);
  }, 30000);

  // Store this connection for broadcasting
  if (!global.resultStreams) {
    global.resultStreams = [];
  }
  global.resultStreams.push(res);

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(keepAlive);
    const index = global.resultStreams.indexOf(res);
    if (index > -1) {
      global.resultStreams.splice(index, 1);
    }
  });
});

module.exports = router;