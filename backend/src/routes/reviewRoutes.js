const express = require('express');
const router = express.Router();
const {
  createReview,
  getGuideReviews,
  markHelpful,
  respondToReview,
  addDestinationReview,
  getDestinationReviews
} = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, createReview);
router.get('/guide/:guideId', getGuideReviews);
router.post('/destination/:destinationId', protect, authorize('tourist', 'guide'), addDestinationReview);
router.get('/destination/:destinationId', getDestinationReviews);
router.put('/:id/helpful', protect, markHelpful);
router.post('/:id/response', protect, authorize('guide'), respondToReview);

module.exports = router;
