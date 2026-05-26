const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
  guide: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  commissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Commission'
  }],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'paid', 'failed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    trim: true
  },
  transactionReference: {
    type: String,
    trim: true
  },
  payoutDate: Date,
  notes: {
    type: String,
    maxlength: 1000
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

payoutSchema.index({ guide: 1, status: 1 });
payoutSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Payout', payoutSchema);
