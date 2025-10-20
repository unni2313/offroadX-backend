const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verify-token');
const Vehicle = require('../models/Vehicle');
const cloudinary = require('../utils/cloudinary');
const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();
const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();
    if (allowed.test(ext) && allowed.test(mime)) cb(null, true);
    else cb(new Error('Only JPG, PNG, WEBP images are allowed'));
  },
});

// GET all vehicles for current user
router.get('/', verifyToken, async (req, res) => {
  const vehicles = await Vehicle.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json(vehicles);
});

// CREATE vehicle
router.post('/', verifyToken, async (req, res) => {
  try {
    const { type, make, model, year, registrationNumber, color, engineCC, seatingCapacity } = req.body;
    if (!type || !make || !model || !registrationNumber) {
      return res.status(400).json({ error: 'type, make, model, registrationNumber are required' });
    }

    const vehicle = await Vehicle.create({
      user: req.user.id,
      type: String(type).trim(),
      make: String(make).trim(),
      model: String(model).trim(),
      year: year ? Number(year) : undefined,
      registrationNumber: String(registrationNumber).trim().toUpperCase(),
      color: color ? String(color).trim() : undefined,
      engineCC: engineCC ? String(engineCC).trim() : undefined,
      seatingCapacity: seatingCapacity ? Number(seatingCapacity) : undefined,
    });

    res.status(201).json(vehicle);
  } catch (err) {
    console.error('Create vehicle error:', err);
    const msg = err?.code === 11000 ? 'Vehicle with this registration already exists' : 'Failed to create vehicle';
    res.status(400).json({ error: msg });
  }
});

// UPDATE vehicle
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const update = { ...req.body };
    if (update.registrationNumber) update.registrationNumber = String(update.registrationNumber).toUpperCase();

    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      update,
      { new: true, runValidators: true }
    );
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(vehicle);
  } catch (err) {
    console.error('Update vehicle error:', err);
    res.status(400).json({ error: 'Failed to update vehicle' });
  }
});

// DELETE vehicle
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({ _id: req.params.id, user: req.user.id });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    if (vehicle.photoPublicId) {
      try { await cloudinary.uploader.destroy(vehicle.photoPublicId); } catch (e) {}
    }

    await Vehicle.deleteOne({ _id: vehicle._id });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete vehicle error:', err);
    res.status(400).json({ error: 'Failed to delete vehicle' });
  }
});

// UPLOAD/REPLACE vehicle photo
router.post('/:id/photo', verifyToken, uploadImage.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const vehicle = await Vehicle.findOne({ _id: req.params.id, user: req.user.id });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    if (vehicle.photoPublicId) {
      try { await cloudinary.uploader.destroy(vehicle.photoPublicId); } catch (e) {}
    }

    const folder = `offroadx/users/${req.user.id}/vehicles/${vehicle._id}`;
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          overwrite: true,
          resource_type: 'image',
          transformation: [
            { width: 1024, height: 768, crop: 'limit' },
            { quality: 'auto:good', fetch_format: 'auto' }
          ]
        },
        (err, result) => (err ? reject(err) : resolve(result))
      );
      stream.end(req.file.buffer);
    });

    vehicle.photoUrl = uploadResult.secure_url;
    vehicle.photoPublicId = uploadResult.public_id;
    await vehicle.save();

    res.json(vehicle);
  } catch (err) {
    console.error('Upload vehicle photo error:', err);
    res.status(500).json({ error: 'Failed to upload vehicle photo' });
  }
});

// DELETE vehicle photo
router.delete('/:id/photo', verifyToken, async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({ _id: req.params.id, user: req.user.id });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    if (vehicle.photoPublicId) {
      try { await cloudinary.uploader.destroy(vehicle.photoPublicId); } catch (e) {}
    }
    vehicle.photoUrl = '';
    vehicle.photoPublicId = '';
    await vehicle.save();

    res.json(vehicle);
  } catch (err) {
    console.error('Delete vehicle photo error:', err);
    res.status(500).json({ error: 'Failed to delete vehicle photo' });
  }
});

module.exports = router;