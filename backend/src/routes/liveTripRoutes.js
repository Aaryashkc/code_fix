const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getAccessibleLiveTrips } = require('../controllers/liveTripController');

router.get('/', protect, getAccessibleLiveTrips);

module.exports = router;
