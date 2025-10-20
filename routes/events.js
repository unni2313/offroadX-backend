const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Event = require('../models/Event');
const User = require('../models/User');
const Registration = require('../models/Registration');
const Race = require('../models/Race');
const Result = require('../models/Result');
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

// GET: Retrieve upcoming events
router.get('/upcoming', authenticateToken, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcomingEvents = await Event.find({
      date: { $gte: today },
      status: 'upcoming'
    }).sort({ date: 1 });
    
    res.status(200).json(upcomingEvents);
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({ error: 'Failed to retrieve upcoming events' });
  }
});

// GET: Get all results (with optional filtering)
router.get('/results', authenticateToken, async (req, res) => {
  try {
    const { mineOnly, eventId, year, search } = req.query;
    const userId = req.user.id;

    const pipeline = [];

    const matchStage = {};

    if (mineOnly === 'true') {
      matchStage.user = new mongoose.Types.ObjectId(userId);
    }

    if (eventId) {
      matchStage.event = new mongoose.Types.ObjectId(eventId);
    }

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    pipeline.push(
      {
        $lookup: {
          from: 'events',
          localField: 'event',
          foreignField: '_id',
          as: 'event'
        }
      },
      { $unwind: '$event' },
      {
        $lookup: {
          from: 'races',
          localField: 'race',
          foreignField: '_id',
          as: 'race'
        }
      },
      { $unwind: '$race' },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicle',
          foreignField: '_id',
          as: 'vehicle'
        }
      },
      { $unwind: { path: '$vehicle', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          eventYear: {
            $cond: {
              if: { $gt: [{ $strLenCP: '$event.date' }, 0] },
              then: { $substr: ['$event.date', 0, 4] },
              else: null
            }
          },
          searchBlob: {
            $toLower: {
              $trim: {
                input: {
                  $concat: [
                    { $ifNull: ['$event.name', ''] }, ' ',
                    { $ifNull: ['$race.name', ''] }, ' ',
                    { $ifNull: ['$user.firstName', ''] }, ' ',
                    { $ifNull: ['$user.secondName', ''] }, ' ',
                    { $ifNull: ['$vehicle.make', ''] }, ' ',
                    { $ifNull: ['$vehicle.model', ''] }
                  ]
                }
              }
            }
          }
        }
      }
    );

    if (year) {
      pipeline.push({ $match: { eventYear: year } });
    }

    if (search) {
      const lowered = search.toLowerCase();
      pipeline.push({ $match: { searchBlob: { $regex: lowered } } });
    }

    pipeline.push(
      { $sort: { 'event.date': -1, 'race.date': -1, position: 1 } },
      {
        $group: {
          _id: '$event._id',
          event: { $first: '$event' },
          races: {
            $push: {
              _id: '$race._id',
              race: '$race',
              position: '$position',
              score: '$score',
              finishingTimeMs: '$finishingTimeMs',
              notes: '$notes',
              participant: '$user',
              vehicle: '$vehicle'
            }
          }
        }
      },
      { $sort: { 'event.date': -1 } }
    );

    const results = await Result.aggregate(pipeline);

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
    
    // Also delete all result records for this event
    await Result.deleteMany({ event: eventId });

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

    // Clean up any Result records created for this registration
    await Result.deleteMany({ registration: registration._id });

    res.status(200).json({ 
      message: 'Registration cancelled successfully. Associated result records removed.'
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

    const registration = await Registration.findById(registrationId)
      .populate('event')
      .populate('races');
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

    // CREATE RESULT RECORDS FOR EACH RACE (fulfilling requirement: "When the participant is approved a record will be stored in results collection")
    const resultPromises = registration.races.map(race => 
      Result.findOneAndUpdate(
        { 
          user: registration.user, 
          race: race._id, 
          event: event._id 
        },
        { 
          user: registration.user,
          race: race._id,
          event: event._id,
          registration: registrationId,
          verifiedByAdmin: false, // Will be set to true after verification
          score: 0,
          finishingTimeMs: 0
        },
        { upsert: true, new: true }
      )
    );
    
    await Promise.all(resultPromises);

    await registration.populate('user', 'firstName secondName email');

    res.status(200).json({ 
      message: 'Registration approved successfully. Result records created for participant.',
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

    // Clean up any Result records that might have been created if this registration was previously approved
    await Result.deleteMany({ registration: registrationId });

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
    
    const results = await Result.find({ event: eventId, race: raceId })
      .populate('user', 'firstName secondName')
      .populate('vehicle', 'make model year')
      .populate('registration', 'status')
      .sort({ position: 1 });

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

    // Validate required fields
    if (!registrationId || !userId) {
      return res.status(400).json({ error: 'Registration ID and User ID are required' });
    }

    // Verify the registration exists and belongs to this event/race
    const registration = await Registration.findById(registrationId)
      .populate('races');
    
    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    if (registration.event.toString() !== eventId) {
      return res.status(400).json({ error: 'Registration does not belong to this event' });
    }

    if (!registration.races.some(race => race._id.toString() === raceId)) {
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

// GET: Retrieve event guidelines
router.get('/:eventId/guidelines', async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId).select('guidelines name');
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ 
      message: 'Guidelines retrieved successfully',
      guidelines: event.guidelines 
    });
  } catch (error) {
    console.error('Error fetching guidelines:', error);
    res.status(500).json({ error: 'Failed to fetch guidelines' });
  }
});

// PUT: Update event guidelines (Admin only)
router.put('/:eventId/guidelines', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { text, checklistItems } = req.body;
    
    if (!text && !checklistItems) {
      return res.status(400).json({ error: 'Please provide text or checklistItems' });
    }

    const updateData = {};
    if (text !== undefined) updateData['guidelines.text'] = text;
    if (checklistItems !== undefined) updateData['guidelines.checklistItems'] = checklistItems;

    const event = await Event.findByIdAndUpdate(
      req.params.eventId,
      updateData,
      { new: true }
    ).select('guidelines name');

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ 
      message: 'Guidelines updated successfully',
      guidelines: event.guidelines 
    });
  } catch (error) {
    console.error('Error updating guidelines:', error);
    res.status(500).json({ error: 'Failed to update guidelines' });
  }
});

// GET: Get pending verifications for a race
router.get('/races/:raceId/pending-verifications', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const raceId = req.params.raceId;

    // Find all results for this race that need verification
    const pendingVerifications = await Result.find({
      race: raceId,
      verifiedByAdmin: false
    })
      .populate('user', 'firstName secondName email phone')
      .populate('vehicle', 'make model year')
      .populate('registration', 'experienceLevel medicalConditions')
      .sort({ createdAt: 1 });

    res.json({
      message: 'Pending verifications retrieved successfully',
      count: pendingVerifications.length,
      verifications: pendingVerifications
    });
  } catch (error) {
    console.error('Error fetching pending verifications:', error);
    res.status(500).json({ error: 'Failed to fetch pending verifications' });
  }
});

// POST: Verify a participant for a race
router.post('/races/:raceId/verify-participant', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { resultId, guidelineChecklist, verificationNotes } = req.body;
    const adminId = req.user.id;

    if (!resultId) {
      return res.status(400).json({ error: 'Result ID is required' });
    }

    // Get the event to access guidelines
    const result = await Result.findById(resultId);
    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }

    const event = await Event.findById(result.event);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if all required guidelines are checked
    if (guidelineChecklist && guidelineChecklist.length > 0) {
      const requiredItems = event.guidelines.checklistItems.filter(item => item.required);
      const checkedRequired = guidelineChecklist.filter(item => item.checked && event.guidelines.checklistItems.find(g => g.item === item.item && g.required));
      
      if (checkedRequired.length < requiredItems.length) {
        return res.status(400).json({ 
          error: 'All required guideline items must be checked',
          required: requiredItems.length,
          checked: checkedRequired.length
        });
      }
    }

    // Update result with verification
    const updatedResult = await Result.findByIdAndUpdate(
      resultId,
      {
        verifiedByAdmin: true,
        verifiedAt: new Date(),
        verifiedBy: adminId,
        verificationNotes: verificationNotes || '',
        guidelineChecklist: guidelineChecklist || []
      },
      { new: true }
    )
      .populate('user', 'firstName secondName email')
      .populate('verifiedBy', 'firstName secondName');

    res.json({
      message: 'Participant verified successfully',
      result: updatedResult
    });
  } catch (error) {
    console.error('Error verifying participant:', error);
    res.status(500).json({ error: 'Failed to verify participant' });
  }
});

// GET: Get verification status for a race
router.get('/races/:raceId/verification-status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const raceId = req.params.raceId;

    const results = await Result.find({ race: raceId })
      .select('user verifiedByAdmin verifiedAt');

    const verified = results.filter(r => r.verifiedByAdmin).length;
    const pending = results.filter(r => !r.verifiedByAdmin).length;

    res.json({
      message: 'Verification status retrieved successfully',
      total: results.length,
      verified,
      pending,
      verificationPercentage: results.length > 0 ? Math.round((verified / results.length) * 100) : 0
    });
  } catch (error) {
    console.error('Error fetching verification status:', error);
    res.status(500).json({ error: 'Failed to fetch verification status' });
  }
});

// GET: Get all results for a race (for viewing and editing)
router.get('/races/:raceId/results', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const raceId = req.params.raceId;

    const results = await Result.find({ race: raceId })
      .populate('user', 'firstName secondName email')
      .populate('vehicle', 'make model year')
      .sort({ createdAt: 1 });

    res.json({
      message: 'Race results retrieved successfully',
      total: results.length,
      results
    });
  } catch (error) {
    console.error('Error fetching race results:', error);
    res.status(500).json({ error: 'Failed to fetch race results' });
  }
});

// POST: Add race results for a verified participant (Admin only)
router.post('/races/:raceId/add-result', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { resultId, score, finishingTimeMs, position, notes } = req.body;
    const raceId = req.params.raceId;

    if (!resultId) {
      return res.status(400).json({ error: 'Result ID is required' });
    }

    // Get the result
    const result = await Result.findById(resultId);
    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }

    // Verify that race ID matches
    if (result.race.toString() !== raceId) {
      return res.status(400).json({ error: 'Race ID mismatch' });
    }

    // Check if participant is verified (KEY VALIDATION)
    if (!result.verifiedByAdmin) {
      return res.status(403).json({ 
        error: 'Participant must be verified before adding results',
        verificationRequired: true,
        verifiedByAdmin: result.verifiedByAdmin
      });
    }

    // Update result with race outcome
    const updatedResult = await Result.findByIdAndUpdate(
      resultId,
      {
        score: score !== undefined ? score : result.score,
        finishingTimeMs: finishingTimeMs !== undefined ? finishingTimeMs : result.finishingTimeMs,
        position: position !== undefined ? position : result.position,
        notes: notes || result.notes
      },
      { new: true }
    )
      .populate('user', 'firstName secondName email')
      .populate('verifiedBy', 'firstName secondName');

    res.json({
      message: 'Race result added successfully',
      result: updatedResult
    });
  } catch (error) {
    console.error('Error adding race result:', error);
    res.status(500).json({ error: 'Failed to add race result' });
  }
});

// PUT: Update race results for a verified participant (Admin only)
router.put('/races/:raceId/results/:resultId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { score, finishingTimeMs, position, notes } = req.body;
    const { raceId, resultId } = req.params;

    // Get the result
    const result = await Result.findById(resultId);
    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }

    // Verify that race ID matches
    if (result.race.toString() !== raceId) {
      return res.status(400).json({ error: 'Race ID mismatch' });
    }

    // Check if participant is verified
    if (!result.verifiedByAdmin) {
      return res.status(403).json({ 
        error: 'Participant must be verified before updating results',
        verificationRequired: true
      });
    }

    // Update result with race outcome
    const updatedResult = await Result.findByIdAndUpdate(
      resultId,
      {
        score: score !== undefined ? score : result.score,
        finishingTimeMs: finishingTimeMs !== undefined ? finishingTimeMs : result.finishingTimeMs,
        position: position !== undefined ? position : result.position,
        notes: notes || result.notes
      },
      { new: true }
    )
      .populate('user', 'firstName secondName email')
      .populate('verifiedBy', 'firstName secondName');

    res.json({
      message: 'Race result updated successfully',
      result: updatedResult
    });
  } catch (error) {
    console.error('Error updating race result:', error);
    res.status(500).json({ error: 'Failed to update race result' });
  }
});

module.exports = router;