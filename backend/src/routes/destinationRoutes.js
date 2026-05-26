const express = require('express');
const router = express.Router();
const {
  getDestinations,
  getDestination,
  getRecommendations,
  createDestination,
  updateDestination,
  deleteDestination,
  getNearbyDestinations,
  searchDestinations,
  verifyDestination,
  getMyPlaces,
  getDestinationStats,
  getFeaturedDestinations
} = require('../controllers/destinationController');
const { protect, authorize } = require('../middleware/auth');

// Public routes (specific routes BEFORE dynamic :id)
router.get('/featured', getFeaturedDestinations);
router.get('/nearby', getNearbyDestinations);
router.get('/search', searchDestinations);
router.get('/stats', protect, authorize('admin'), getDestinationStats);
router.get('/recommendations', protect, authorize('tourist'), getRecommendations);
router.get('/my-places', protect, authorize('guide'), getMyPlaces);
router.get('/', getDestinations);
router.get('/:id', getDestination);

// Admin/Guide routes
router.post('/', protect, authorize('admin', 'guide'), createDestination);
router.put('/:id', protect, authorize('admin'), updateDestination); // Admin only to match controller
router.patch('/:id/verify', protect, authorize('admin'), verifyDestination);
router.delete('/:id', protect, authorize('admin'), deleteDestination);

module.exports = router;
