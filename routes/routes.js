const express = require('express');
const router = express.Router();
const Route = require('../models/Route');
const Notification = require('../models/Notification');
const auth = require('../utils/verify-token');

// Get all routes (with optional filtering)
router.get('/', auth, async (req, res) => {
  try {
    const { difficulty, terrain, isActive, search } = req.query;
    let query = {};

    // Build query based on filters
    if (difficulty) query.difficulty = difficulty;
    if (terrain) query.terrain = terrain;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    const routes = await Route.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(routes);
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single route by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const route = await Route.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    res.json(route);
  } catch (error) {
    console.error('Error fetching route:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new route (admin only)
router.post('/', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const {
      name,
      description,
      difficulty,
      distance,
      estimatedTime,
      terrain,
      startLocation,
      startCoordinates,
      endLocation,
      endCoordinates,
      waypoints,
      safetyNotes,
      requiredVehicleType,
      maxParticipants
    } = req.body;

    // Validate required fields
    if (!name || !description || !difficulty || !distance || !estimatedTime ||
      !terrain || !startLocation || !endLocation) {
      return res.status(400).json({
        message: 'Please provide all required fields'
      });
    }

    // Check if route name already exists
    const existingRoute = await Route.findOne({ name: name.trim() });
    if (existingRoute) {
      return res.status(400).json({
        message: 'A route with this name already exists'
      });
    }

    const route = new Route({
      name: name.trim(),
      description,
      difficulty,
      distance: parseFloat(distance),
      estimatedTime,
      terrain,
      startLocation,
      startCoordinates: startCoordinates || { lat: null, lng: null },
      endLocation,
      endCoordinates: endCoordinates || { lat: null, lng: null },
      waypoints: waypoints || [],
      safetyNotes,
      requiredVehicleType: requiredVehicleType || 'Any',
      maxParticipants: parseInt(maxParticipants) || 20,
      createdBy: req.user.id
    });

    await route.save();

    // Create notification
    const notification = new Notification({
      type: 'trail',
      message: `New trails open: ${route.name}`
    });
    await notification.save();

    // Populate the createdBy field before sending response
    await route.populate('createdBy', 'name email');

    res.status(201).json(route);
  } catch (error) {
    console.error('Error creating route:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: errors.join(', ') });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Update route (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const route = await Route.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    const {
      name,
      description,
      difficulty,
      distance,
      estimatedTime,
      terrain,
      startLocation,
      startCoordinates,
      endLocation,
      endCoordinates,
      waypoints,
      safetyNotes,
      requiredVehicleType,
      maxParticipants
    } = req.body;

    // Check if new name conflicts with existing route (excluding current route)
    if (name && name.trim() !== route.name) {
      const existingRoute = await Route.findOne({
        name: name.trim(),
        _id: { $ne: req.params.id }
      });
      if (existingRoute) {
        return res.status(400).json({
          message: 'A route with this name already exists'
        });
      }
    }

    // Update fields
    if (name) route.name = name.trim();
    if (description) route.description = description;
    if (difficulty) route.difficulty = difficulty;
    if (distance !== undefined) route.distance = parseFloat(distance);
    if (estimatedTime) route.estimatedTime = estimatedTime;
    if (terrain) route.terrain = terrain;
    if (startLocation) route.startLocation = startLocation;
    if (startCoordinates !== undefined) route.startCoordinates = startCoordinates;
    if (endLocation) route.endLocation = endLocation;
    if (endCoordinates !== undefined) route.endCoordinates = endCoordinates;
    if (waypoints !== undefined) route.waypoints = waypoints;
    if (safetyNotes !== undefined) route.safetyNotes = safetyNotes;
    if (requiredVehicleType) route.requiredVehicleType = requiredVehicleType;
    if (maxParticipants !== undefined) route.maxParticipants = parseInt(maxParticipants);

    await route.save();
    await route.populate('createdBy', 'name email');

    res.json(route);
  } catch (error) {
    console.error('Error updating route:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: errors.join(', ') });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle route active status (admin only)
router.patch('/:id/toggle', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const route = await Route.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    route.isActive = !route.isActive;
    await route.save();
    await route.populate('createdBy', 'name email');

    res.json(route);
  } catch (error) {
    console.error('Error toggling route status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete route (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const route = await Route.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    await Route.findByIdAndDelete(req.params.id);
    res.json({ message: 'Route deleted successfully' });
  } catch (error) {
    console.error('Error deleting route:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get routes statistics (admin only)
router.get('/stats/overview', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const totalRoutes = await Route.countDocuments();
    const activeRoutes = await Route.countDocuments({ isActive: true });
    const inactiveRoutes = await Route.countDocuments({ isActive: false });

    // Routes by difficulty
    const difficultyStats = await Route.aggregate([
      { $group: { _id: '$difficulty', count: { $sum: 1 } } }
    ]);

    // Routes by terrain
    const terrainStats = await Route.aggregate([
      { $group: { _id: '$terrain', count: { $sum: 1 } } }
    ]);

    // Average distance
    const avgDistance = await Route.aggregate([
      { $group: { _id: null, avgDistance: { $avg: '$distance' } } }
    ]);

    res.json({
      totalRoutes,
      activeRoutes,
      inactiveRoutes,
      difficultyStats,
      terrainStats,
      averageDistance: avgDistance[0]?.avgDistance || 0
    });
  } catch (error) {
    console.error('Error fetching route statistics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;