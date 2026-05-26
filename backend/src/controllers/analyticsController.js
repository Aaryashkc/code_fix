const Booking = require('../models/Booking');
const User = require('../models/User');
const Destination = require('../models/Destination');

const MONTHS_TO_INCLUDE = 6;
const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  timeZone: 'UTC'
});

const buildMonthBuckets = (monthsToInclude = MONTHS_TO_INCLUDE) => {
  const now = new Date();
  const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  return Array.from({ length: monthsToInclude }, (_, index) => {
    const date = new Date(
      Date.UTC(
        currentMonthStart.getUTCFullYear(),
        currentMonthStart.getUTCMonth() - (monthsToInclude - 1 - index),
        1
      )
    );

    return {
      key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`,
      month: monthFormatter.format(date),
      date
    };
  });
};

const mergeSeriesWithBuckets = (buckets, rows, valueKey) => {
  const valuesByMonth = new Map(rows.map((row) => [row._id, row[valueKey] ?? 0]));

  return buckets.map(({ key, month }) => ({
    month,
    [valueKey]: valuesByMonth.get(key) ?? 0
  }));
};

const formatStatusLabel = (status = 'unknown') =>
  status
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

// @desc    Get platform analytics
// @route   GET /api/analytics
// @access  Private (Admin)
exports.getAnalytics = async (req, res) => {
  try {
    const monthBuckets = buildMonthBuckets();
    const analyticsWindowStart = monthBuckets[0].date;

    const [
      bookingsTrend,
      revenueTrend,
      bookingCategoryBreakdown,
      destinationCategoryFallback,
      bookingStatusBreakdown,
      userGrowth,
      totalBookings,
      totalUsers,
      totalGuides,
      revenueSummary,
      paidBookings
    ] = await Promise.all([
      Booking.aggregate([
        { $match: { createdAt: { $gte: analyticsWindowStart } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m',
                date: '$createdAt'
              }
            },
            bookings: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: analyticsWindowStart },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m',
                date: '$createdAt'
              }
            },
            revenue: { $sum: '$totalPrice' }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Booking.aggregate([
        { $match: { createdAt: { $gte: analyticsWindowStart } } },
        { $unwind: '$destinations' },
        {
          $lookup: {
            from: 'destinations',
            localField: 'destinations',
            foreignField: '_id',
            as: 'destination'
          }
        },
        { $unwind: '$destination' },
        {
          $group: {
            _id: {
              bookingId: '$_id',
              category: '$destination.category'
            }
          }
        },
        {
          $group: {
            _id: '$_id.category',
            value: { $sum: 1 }
          }
        },
        { $sort: { value: -1 } },
        { $limit: 5 }
      ]),
      Destination.aggregate([
        { $group: { _id: '$category', value: { $sum: 1 } } },
        { $sort: { value: -1 } },
        { $limit: 5 }
      ]),
      Booking.aggregate([
        {
          $group: {
            _id: '$status',
            value: { $sum: 1 }
          }
        },
        { $sort: { value: -1 } }
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: analyticsWindowStart } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m',
                date: '$createdAt'
              }
            },
            users: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Booking.countDocuments(),
      User.countDocuments(),
      User.countDocuments({
        role: 'guide',
        verified: true,
        available: true,
        suspended: false
      }),
      Booking.aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalPrice' },
            revenueBookings: { $sum: 1 }
          }
        }
      ]),
      Booking.countDocuments({ paymentStatus: 'paid' })
    ]);

    const bookingsData = mergeSeriesWithBuckets(monthBuckets, bookingsTrend, 'bookings');
    const revenueData = mergeSeriesWithBuckets(monthBuckets, revenueTrend, 'revenue');
    const userGrowthData = mergeSeriesWithBuckets(monthBuckets, userGrowth, 'users');

    const rawCategoryData =
      bookingCategoryBreakdown.length > 0 ? bookingCategoryBreakdown : destinationCategoryFallback;
    const categoryData = rawCategoryData.map((category) => ({
      name: category._id || 'Other',
      value: category.value
    }));

    const bookingStatusData = bookingStatusBreakdown.map((status) => ({
      name: formatStatusLabel(status._id),
      value: status.value
    }));

    const pendingBookings =
      bookingStatusBreakdown.find((status) => status._id === 'pending')?.value ?? 0;
    const completedBookings =
      bookingStatusBreakdown.find((status) => status._id === 'completed')?.value ?? 0;

    const revenueStats = revenueSummary[0] || {
      totalRevenue: 0,
      revenueBookings: 0
    };

    res.status(200).json({
      success: true,
      data: {
        bookingsData,
        revenueData,
        categoryData,
        bookingStatusData,
        userGrowthData,
        summary: {
          totalBookings,
          totalUsers,
          totalGuides,
          totalRevenue: revenueStats.totalRevenue,
          pendingBookings,
          completedBookings,
          paidBookings,
          averageBookingValue:
            revenueStats.revenueBookings > 0
              ? Math.round(revenueStats.totalRevenue / revenueStats.revenueBookings)
              : 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
