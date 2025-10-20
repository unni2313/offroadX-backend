const express = require('express');
const router = express.Router();
const Race = require('../models/Race');
const Event = require('../models/Event');
const Route = require('../models/Route');
const User = require('../models/User');
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

// GET: Retrieve all races
router.get('/', async (req, res) => {
  try {
    const races = await Race.find()
      .populate('event', 'name date location')
      .populate('route', 'name difficulty distance')
      .populate('createdBy', 'firstName secondName')
      .sort({ createdAt: -1 });
    res.status(200).json({
      message: 'Races retrieved successfully',
      races,
      count: races.length
    });
  } catch (error) {
    console.error('Error fetching races:', error);
    res.status(500).json({ error: 'Failed to retrieve races' });
  }
});

// GET: Retrieve races for a specific event
router.get('/event/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const races = await Race.find({ event: eventId })
      .populate('route', 'name difficulty distance')
      .populate('createdBy', 'firstName secondName')
      .sort({ createdAt: -1 });
    res.status(200).json({
      message: 'Races retrieved successfully',
      races,
      count: races.length
    });
  } catch (error) {
    console.error('Error fetching races for event:', error);
    res.status(500).json({ error: 'Failed to retrieve races' });
  }
});

// GET: Retrieve all results for a specific race
// NOTE: This MUST come before the generic /:id route to avoid route conflict
router.get('/:raceId/results', authenticateToken, async (req, res) => {
  try {
    const { raceId } = req.params;

    // Verify race exists
    const race = await Race.findById(raceId);
    if (!race) {
      return res.status(404).json({ error: 'Race not found' });
    }

    // Get the event for this race
    const eventId = race.event;

    // Find all registrations for this event that include this race
    const Registration = require('../models/Registration');
    const registrations = await Registration.find({
      event: eventId,
      races: raceId,
      status: 'approved'  // Only approved registrations
    }).populate('user', 'firstName secondName email').populate('vehicles', 'make model year');

    // Create Result documents for registrations that don't have results yet
    for (const registration of registrations) {
      const existingResult = await Result.findOne({
        race: raceId,
        registration: registration._id,
        user: registration.user._id
      });

      if (!existingResult) {
        // Get the vehicle for this race from vehiclesByRace map if available
        let vehicleId = null;
        if (registration.vehiclesByRace && registration.vehiclesByRace.get(raceId)) {
          vehicleId = registration.vehiclesByRace.get(raceId)[0];
        } else if (registration.vehicles && registration.vehicles.length > 0) {
          vehicleId = registration.vehicles[0]._id;
        }

        // Create a new Result document
        await Result.create({
          event: eventId,
          race: raceId,
          registration: registration._id,
          user: registration.user._id,
          vehicle: vehicleId,
          score: 0,
          finishingTimeMs: 0,
          position: null,
          verifiedByAdmin: false
        });
      }
    }

    // Fetch all results for this race (now including newly created ones)
    const results = await Result.find({ race: raceId })
      .populate('user', 'firstName secondName email')
      .populate('vehicle', 'make model year registrationNumber')
      .populate({
        path: 'registration',
        populate: {
          path: 'vehicles',
          select: '_id make model year registrationNumber color type'
        }
      })
      .sort({ position: 1, score: -1 });

    res.status(200).json({
      message: 'Results retrieved successfully',
      results
    });
  } catch (error) {
    console.error('Error fetching race results:', error);
    res.status(500).json({ error: 'Failed to retrieve race results' });
  }
});

// GET: Retrieve a specific race by ID
router.get('/:id', async (req, res) => {
  try {
    const race = await Race.findById(req.params.id)
      .populate('event', 'name date location')
      .populate('route')
      .populate('createdBy', 'firstName secondName');
    if (!race) {
      return res.status(404).json({ error: 'Race not found' });
    }
    res.status(200).json({ message: 'Race retrieved successfully', race });
  } catch (error) {
    console.error('Error fetching race:', error);
    res.status(500).json({ error: 'Failed to retrieve race' });
  }
});

// POST: Create new race (Admin only)
router.post('/create', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { event: eventId, route: routeId, ...raceData } = req.body;

    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Verify route exists
    const route = await Route.findById(routeId);
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    const race = new Race({
      ...raceData,
      event: eventId,
      route: routeId,
      createdBy: req.user.id
    });

    await race.save();

    // Populate for response
    await race.populate('event', 'name date location');
    await race.populate('route', 'name difficulty distance');
    await race.populate('createdBy', 'firstName secondName');

    res.status(201).json({ message: 'Race created successfully', race });
  } catch (error) {
    console.error('Error saving race:', error);
    res.status(500).json({ error: 'Failed to create race' });
  }
});

// POST: Verify a participant (Admin only)
router.post('/:raceId/verify-participant', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { raceId } = req.params;
    const { resultId, guidelineChecklist, verificationNotes } = req.body;

    // Verify race exists
    const race = await Race.findById(raceId);
    if (!race) {
      return res.status(404).json({ error: 'Race not found' });
    }

    // Find and update the result
    const result = await Result.findByIdAndUpdate(
      resultId,
      {
        verifiedByAdmin: true,
        verifiedAt: new Date(),
        verifiedBy: req.user.id,
        guidelineChecklist: guidelineChecklist || [],
        verificationNotes: verificationNotes || ''
      },
      { new: true }
    )
      .populate('user', 'firstName secondName email')
      .populate('vehicle', 'make model year');

    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }

    res.status(200).json({
      message: 'Participant verified successfully',
      result
    });
  } catch (error) {
    console.error('Error verifying participant:', error);
    res.status(500).json({ error: 'Failed to verify participant' });
  }
});

// POST: Add or update result data for a verified participant (Admin only)
router.post('/:raceId/add-result', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { raceId } = req.params;
    const { resultId, score, finishingTimeMs, position, notes, vehicle } = req.body;

    // Verify race exists
    const race = await Race.findById(raceId);
    if (!race) {
      return res.status(404).json({ error: 'Race not found' });
    }

    // Verify result is already verified before updating with result data
    const existingResult = await Result.findById(resultId);
    if (!existingResult) {
      return res.status(404).json({ error: 'Result not found' });
    }

    if (!existingResult.verifiedByAdmin) {
      return res.status(400).json({ error: 'Participant must be verified before adding results' });
    }

    // Update result with score, timing data, and vehicle
    const updateData = {
      score: Number(score) || 0,
      finishingTimeMs: Number(finishingTimeMs) || 0,
      position: Number(position) || null,
      notes: notes || ''
    };

    // Only update vehicle if provided
    if (vehicle) {
      updateData.vehicle = vehicle;
    }

    const result = await Result.findByIdAndUpdate(
      resultId,
      updateData,
      { new: true }
    )
      .populate('user', 'firstName secondName email')
      .populate('vehicle', 'make model year registrationNumber');

    res.status(200).json({
      message: 'Result saved successfully',
      result
    });
  } catch (error) {
    console.error('Error saving result:', error);
    res.status(500).json({ error: 'Failed to save result' });
  }
});

// PUT: Update race (Admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { event: eventId, route: routeId, ...updateData } = req.body;

    // If event is being updated, verify it exists
    if (eventId) {
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
    }

    // If route is being updated, verify it exists
    if (routeId) {
      const route = await Route.findById(routeId);
      if (!route) {
        return res.status(404).json({ error: 'Route not found' });
      }
    }

    const race = await Race.findByIdAndUpdate(req.params.id, {
      ...updateData,
      ...(eventId && { event: eventId }),
      ...(routeId && { route: routeId })
    }, { new: true })
      .populate('event', 'name date location')
      .populate('route', 'name difficulty distance')
      .populate('createdBy', 'firstName secondName');

    if (!race) {
      return res.status(404).json({ error: 'Race not found' });
    }

    res.status(200).json({ message: 'Race updated successfully', race });
  } catch (error) {
    console.error('Error updating race:', error);
    res.status(500).json({ error: 'Failed to update race' });
  }
});

// DELETE: Delete a race (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const race = await Race.findByIdAndDelete(req.params.id);

    if (!race) {
      return res.status(404).json({ message: 'Race not found' });
    }

    res.status(200).json({ message: 'Race deleted successfully' });
  } catch (error) {
    console.error('Error deleting race:', error);
    res.status(500).json({ error: 'Failed to delete race' });
  }
});

module.exports = router;