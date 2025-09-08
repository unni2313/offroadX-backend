const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, required: true, trim: true }, // car/bike/ATV etc.
  make: { type: String, required: true, trim: true },
  model: { type: String, required: true, trim: true },
  year: { type: Number },
  registrationNumber: { type: String, required: true, trim: true },
  color: { type: String, trim: true },
  engineCC: { type: String, trim: true },
  seatingCapacity: { type: Number },

  photoUrl: { type: String, default: '' },
  photoPublicId: { type: String, default: '' },
}, { timestamps: true });

vehicleSchema.index({ user: 1, registrationNumber: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);