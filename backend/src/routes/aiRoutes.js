const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { generateItinerary } = require('../controllers/aiController');

router.post('/generate-itinerary', protect, authorize('tourist'), generateItinerary);

module.exports = router;
