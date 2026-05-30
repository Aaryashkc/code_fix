const Commission = require('../models/Commission');
const Payout = require('../models/Payout');
const User = require('../models/User');
const mongoose = require('mongoose');
const { ensureCommissionsForCompletedBookings, ensureCommissionsForGuide } = require('../utils/commissionBackfill');

// @desc    Get pending payouts per guide
// @route   GET /api/payouts/pending
// @access  Private (Admin)
exports.getPendingPayouts = async (req, res) => {
  try {
    await ensureCommissionsForCompletedBookings();

    const pendingByGuide = await Commission.aggregate([
      { $match: { status: 'pending' } },
      {
        $group: {
          _id: '$guide',
          pendingAmount: { $sum: '$guideEarning' },
          commissionCount: { $sum: 1 },
          oldestPending: { $min: '$createdAt' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'guide',
          pipeline: [
            { $project: { name: 1, email: 1, avatar: 1 } }
          ]
        }
      },
      { $unwind: '$guide' },
      { $sort: { pendingAmount: -1 } }
    ]);

    const totalPending = pendingByGuide.reduce((sum, g) => sum + g.pendingAmount, 0);

    res.status(200).json({
      success: true,
      data: {
        totalPending,
        guides: pendingByGuide
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Create a payout for a guide
// @route   POST /api/payouts
// @access  Private (Admin)
exports.createPayout = async (req, res) => {
  try {
    const { guideId, paymentMethod, transactionReference, notes } = req.body;

    if (!guideId || !mongoose.Types.ObjectId.isValid(guideId)) {
      return res.status(400).json({ success: false, message: 'Valid guide ID is required' });
    }

    const guide = await User.findOne({ _id: guideId, role: 'guide' });
    if (!guide) {
      return res.status(404).json({ success: false, message: 'Guide not found' });
    }

    // Find all pending commissions for this guide
    const pendingCommissions = await Commission.find({
      guide: guideId,
      status: 'pending'
    });

    if (pendingCommissions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No pending commissions found for this guide'
      });
    }

    const totalAmount = pendingCommissions.reduce((sum, c) => sum + c.guideEarning, 0);
    const commissionIds = pendingCommissions.map(c => c._id);

    // Create payout record
    const payout = await Payout.create({
      guide: guideId,
      commissions: commissionIds,
      totalAmount: Math.round(totalAmount * 100) / 100,
      paymentMethod: paymentMethod || 'bank_transfer',
      transactionReference: transactionReference || '',
      notes: notes || '',
      payoutDate: new Date(),
      processedBy: req.user.id,
      status: 'processing'
    });

    // Mark all included commissions as paid_out
    await Commission.updateMany(
      { _id: { $in: commissionIds } },
      { $set: { status: 'paid_out', payout: payout._id } }
    );

    await payout.populate('guide', 'name email avatar');

    res.status(201).json({
      success: true,
      message: `Payout of Rs. ${totalAmount.toLocaleString()} created for ${guide.name}`,
      data: payout
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Update payout status
// @route   PUT /api/payouts/:id/status
// @access  Private (Admin)
exports.updatePayoutStatus = async (req, res) => {
  try {
    const { status, transactionReference, notes } = req.body;

    const validStatuses = ['pending', 'processing', 'paid', 'failed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    const payout = await Payout.findById(req.params.id);
    if (!payout) {
      return res.status(404).json({ success: false, message: 'Payout not found' });
    }

    payout.status = status;
    if (transactionReference) payout.transactionReference = transactionReference;
    if (notes) payout.notes = notes;
    if (status === 'paid') payout.payoutDate = new Date();

    // If payout failed, revert commissions back to pending
    if (status === 'failed') {
      await Commission.updateMany(
        { payout: payout._id },
        { $set: { status: 'pending' }, $unset: { payout: 1 } }
      );
    }

    await payout.save();
    await payout.populate('guide', 'name email avatar');

    res.status(200).json({
      success: true,
      message: `Payout status updated to ${status}`,
      data: payout
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get payout history (all or for a guide)
// @route   GET /api/payouts/history
// @access  Private (Admin)
exports.getPayoutHistory = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.guideId && mongoose.Types.ObjectId.isValid(req.query.guideId)) {
      filter.guide = req.query.guideId;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const [payouts, total] = await Promise.all([
      Payout.find(filter)
        .populate('guide', 'name email avatar')
        .populate('processedBy', 'name')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit),
      Payout.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      count: payouts.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: payouts
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get payout history for a specific guide
// @route   GET /api/payouts/guide/:id
// @access  Private (Admin or own Guide)
exports.getGuidePayouts = async (req, res) => {
  try {
    // Guides can only see their own payouts
    if (req.user.role === 'guide' && req.user.id !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [payouts, total] = await Promise.all([
      Payout.find({ guide: req.params.id })
        .populate('processedBy', 'name')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit),
      Payout.countDocuments({ guide: req.params.id })
    ]);

    res.status(200).json({
      success: true,
      count: payouts.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: payouts
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Guide requests a payout of all their pending commissions
// @route   POST /api/payouts/request
// @access  Private (Guide)
exports.requestPayout = async (req, res) => {
  try {
    const { paymentMethod, notes } = req.body;
    const guideId = req.user.id;

    await ensureCommissionsForGuide(guideId);

    const pendingCommissions = await Commission.find({ guide: guideId, status: 'pending' });
    if (pendingCommissions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No pending earnings to request a payout for. Complete a trip first.'
      });
    }

    // Block duplicate pending requests
    const existingRequest = await Payout.findOne({ guide: guideId, status: 'pending' });
    if (existingRequest) {
      return res.status(409).json({
        success: false,
        message: 'You already have a pending payout request. Please wait for it to be processed.'
      });
    }

    const totalAmount = pendingCommissions.reduce((sum, c) => sum + c.guideEarning, 0);

    const payout = await Payout.create({
      guide: guideId,
      commissions: pendingCommissions.map((c) => c._id),
      totalAmount: Math.round(totalAmount * 100) / 100,
      status: 'pending',
      paymentMethod: paymentMethod || 'bank_transfer',
      notes: notes || ''
    });

    res.status(201).json({
      success: true,
      message: `Payout request of Rs. ${totalAmount.toLocaleString()} submitted. Admin will process it shortly.`,
      data: payout
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get the calling guide's own payout history + pending balance
// @route   GET /api/payouts/my
// @access  Private (Guide)
exports.getMyPayouts = async (req, res) => {
  try {
    const guideId = req.user.id;

    await ensureCommissionsForGuide(guideId);

    const [payouts, pendingCommissions] = await Promise.all([
      Payout.find({ guide: guideId }).sort('-createdAt').limit(20),
      Commission.find({ guide: guideId, status: 'pending' })
    ]);

    const pendingBalance = pendingCommissions.reduce((sum, c) => sum + c.guideEarning, 0);
    const hasActivePayout = await Payout.exists({ guide: guideId, status: 'pending' });

    res.status(200).json({
      success: true,
      data: {
        payouts,
        pendingBalance: Math.round(pendingBalance * 100) / 100,
        pendingCommissionCount: pendingCommissions.length,
        hasActivePayout: Boolean(hasActivePayout)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Download payout summary as CSV
// @route   GET /api/payouts/download
// @access  Private (Admin)
exports.downloadPayoutSummary = async (req, res) => {
  try {
    const filter = {};
    if (req.query.startDate) filter.createdAt = { $gte: new Date(req.query.startDate) };
    if (req.query.endDate) {
      filter.createdAt = filter.createdAt || {};
      filter.createdAt.$lte = new Date(req.query.endDate);
    }
    if (req.query.status) filter.status = req.query.status;

    const payouts = await Payout.find(filter)
      .populate('guide', 'name email')
      .populate('processedBy', 'name')
      .sort('-createdAt')
      .lean();

    // Build CSV
    const headers = [
      'Payout ID',
      'Guide Name',
      'Guide Email',
      'Amount (Rs)',
      'Status',
      'Payment Method',
      'Transaction Ref',
      'Payout Date',
      'Processed By',
      'Commissions Count',
      'Notes'
    ];

    const rows = payouts.map(p => [
      p._id.toString(),
      `"${(p.guide?.name || '').replace(/"/g, '""')}"`,
      p.guide?.email || '',
      p.totalAmount,
      p.status,
      p.paymentMethod || '',
      `"${(p.transactionReference || '').replace(/"/g, '""')}"`,
      p.payoutDate ? new Date(p.payoutDate).toISOString().split('T')[0] : '',
      p.processedBy?.name || '',
      p.commissions?.length || 0,
      `"${(p.notes || '').replace(/"/g, '""')}"`
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=payout-summary-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
