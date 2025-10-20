
const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verify-token');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const multer = require('multer');
const path = require('path');
const cloudinary = require('../utils/cloudinary');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB default
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();
    if (allowed.test(ext) && allowed.test(mime)) cb(null, true);
    else cb(new Error('Only JPG, PNG, WEBP images are allowed'));
  },
});

// Separate uploader for PDFs (driving license doc)
const uploadPdf = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype?.toLowerCase() || '';
    if (ext === '.pdf' || mime.includes('pdf')) cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
});

router.get('/', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/', verifyToken, async (req, res) => {
  try {
    const { firstName, secondName, email, phone, currentPassword, newPassword, dob, drivingLicenseNumber } = req.body;
    
    // Basic validation
    if (!firstName || !secondName || !email) {
      return res.status(400).json({ error: 'First name, last name, and email are required' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    // Optional: validate India DL number pattern (basic)
    if (drivingLicenseNumber && !/^[A-Z]{2}\d{2}\s?\d{11}$/.test(drivingLicenseNumber.trim().toUpperCase())) {
      return res.status(400).json({ error: 'Please enter a valid Indian driving license number' });
    }

    // Password validation if changing password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change password' });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
      }

      // Get user with password to verify current password
      const userWithPassword = await User.findById(req.user.id);
      if (!userWithPassword) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userWithPassword.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    }

    // Check if email is already taken by another user
    const existingUser = await User.findOne({ 
      email: email.toLowerCase(), 
      _id: { $ne: req.user.id } 
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already taken by another user' });
    }

    // Prepare update data
    const updateData = {
      firstName: firstName.trim(),
      secondName: secondName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : '',
      updatedAt: new Date(),
    };

    if (dob) {
      const parsed = new Date(dob);
      if (isNaN(parsed.getTime())) return res.status(400).json({ error: 'Invalid date of birth' });
      updateData.dob = parsed;
    }

    if (typeof drivingLicenseNumber === 'string') {
      updateData.drivingLicenseNumber = drivingLicenseNumber.trim().toUpperCase();
    }

    // Hash new password if provided
    if (newPassword) {
      const saltRounds = 10;
      updateData.password = await bcrypt.hash(newPassword, saltRounds);
    }

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload profile photo
router.post('/photo', verifyToken, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Delete old image if exists
    if (user.profilePhotoPublicId) {
      try {
        await cloudinary.uploader.destroy(user.profilePhotoPublicId);
      } catch (e) {
        console.warn('Cloudinary delete failed:', e?.message);
      }
    }

    // Upload to Cloudinary
    const folder = `offroadx/users/${user._id}`;
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          overwrite: true,
          resource_type: 'image',
          transformation: [
            { width: 512, height: 512, crop: 'limit' },
            { quality: 'auto:good', fetch_format: 'auto' }
          ]
        },
        (err, result) => (err ? reject(err) : resolve(result))
      );
      stream.end(req.file.buffer);
    });

    user.profilePhotoUrl = uploadResult.secure_url;
    user.profilePhotoPublicId = uploadResult.public_id;
    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;
    res.json(safeUser);
  } catch (err) {
    console.error('Error uploading photo:', err);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// Remove profile photo
router.delete('/photo', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.profilePhotoPublicId) {
      try {
        await cloudinary.uploader.destroy(user.profilePhotoPublicId);
      } catch (e) {
        console.warn('Cloudinary delete failed:', e?.message);
      }
    }

    user.profilePhotoUrl = '';
    user.profilePhotoPublicId = '';
    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;
    res.json(safeUser);
  } catch (err) {
    console.error('Error deleting photo:', err);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

// Upload driving license PDF
router.post('/license', verifyToken, uploadPdf.single('license'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Delete old license doc if exists
    if (user.licenseDocPublicId) {
      try { await cloudinary.uploader.destroy(user.licenseDocPublicId, { resource_type: 'raw' }); } catch (e) {}
    }

    const folder = `offroadx/users/${user._id}/license`;
    const dataUri = `data:application/pdf;base64,${req.file.buffer.toString('base64')}`;
    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      folder,
      resource_type: 'raw',
      format: 'pdf',
      use_filename: true,
      unique_filename: true,
      overwrite: true
    });

    user.licenseDocUrl = uploadResult.secure_url || uploadResult.url;
    user.licenseDocPublicId = uploadResult.public_id;
    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;
    res.json(safeUser);
  } catch (err) {
    console.error('Error uploading license:', err);
    const message = err?.error?.message || err?.message || 'Failed to upload license document';
    res.status(500).json({ error: message });
  }
});

// Delete driving license PDF
router.delete('/license', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.licenseDocPublicId) {
      try {
        await cloudinary.uploader.destroy(user.licenseDocPublicId, { resource_type: 'raw' });
      } catch (e) {
        console.warn('Cloudinary delete failed:', e?.message);
      }
    }

    user.licenseDocUrl = '';
    user.licenseDocPublicId = '';
    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;
    res.json(safeUser);
  } catch (err) {
    console.error('Error deleting license:', err);
    res.status(500).json({ error: 'Failed to delete license document' });
  }
});

// Get downloadable license URL (signed)
router.get('/license/url', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.licenseDocPublicId) return res.status(404).json({ error: 'No license document' });

    const publicId = user.licenseDocPublicId;
    const match = publicId.match(/\.([a-z0-9]+)$/i);
    const ext = match ? match[1] : 'pdf';
    const idNoExt = match ? publicId.slice(0, -match[0].length) : publicId;

    const expiresAt = Math.floor(Date.now() / 1000) + 300; // 5 minutes
    const url = cloudinary.utils.private_download_url(
      idNoExt,
      ext,
      { resource_type: 'raw', attachment: true, expires_at: expiresAt, filename: 'licence' }
    );

    return res.json({ url });
  } catch (err) {
    console.error('Error generating license URL:', err);
    res.status(500).json({ error: 'Failed to generate download URL' });
  }
});

// Redirect to a signed download URL
router.get('/license/download', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.licenseDocPublicId) return res.status(404).json({ error: 'No license document' });

    const publicId = user.licenseDocPublicId;
    const match = publicId.match(/\.([a-z0-9]+)$/i);
    const ext = match ? match[1] : 'pdf';
    const idNoExt = match ? publicId.slice(0, -match[0].length) : publicId;

    const expiresAt = Math.floor(Date.now() / 1000) + 300; // 5 minutes
    const url = cloudinary.utils.private_download_url(
      idNoExt,
      ext,
      { resource_type: 'raw', attachment: true, expires_at: expiresAt, filename: 'licence' }
    );

    return res.redirect(url);
  } catch (err) {
    console.error('Error redirecting to license download:', err);
    res.status(500).json({ error: 'Failed to redirect to download URL' });
  }
});

module.exports = router;
