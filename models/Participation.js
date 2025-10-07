 const mongoose = require('mongoose');

const participationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  vehicles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' }], // allow multiple vehicles
  status: { type: String, enum: ['joined', 'cancelled'], default: 'joined' },
}, { timestamps: true });

participationSchema.index({ user: 1, event: 1 }, { unique: true });

module.exports = mongoose.model('Participation', participationSchema);