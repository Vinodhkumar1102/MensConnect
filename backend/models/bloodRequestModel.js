const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Blood donation request schema
 * Fields derived from src/screen/Blood.js
 */
const BloodRequestSchema = new Schema(
  {
    name: { type: String, trim: true, required: true },
    bloodGroup: { type: String, trim: true, required: true },
    hospital: { type: String, trim: true, default: '' },
    contact: { type: String, trim: true, required: true },
    // human-readable location string (backwards compatibility)
    location: { type: String, trim: true, default: '' },
    // GeoJSON point: [ longitude, latitude ]
    locationGeo: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    // optional resolved address text
    locationText: { type: String, trim: true, default: '' },
    // optional metadata: who posted it (if you later have users)
    postedBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    active: { type: Boolean, default: true },
    sentToAdmin: { type: Boolean, default: false },
    sentToAdminAt: { type: Date },
  },
  { timestamps: true }
);

// enable geospatial queries on locationGeo
BloodRequestSchema.index({ locationGeo: '2dsphere' });

module.exports = mongoose.model('BloodRequest', BloodRequestSchema);
