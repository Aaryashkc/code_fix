const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createTrip,
  getMyTrips,
  updateTrip,
  deleteTrip,
  optimizeTrip,
  addSnackStop,
  removeSnackStop,
} = require('../controllers/tripController');

router.post('/', protect, createTrip);
router.get('/', protect, getMyTrips);
router.post('/:id/optimize', protect, optimizeTrip);
router.post('/:id/snack-stops', protect, addSnackStop);
router.delete('/:id/snack-stops/:stopIndex', protect, removeSnackStop);
router.put('/:id', protect, updateTrip);
router.delete('/:id', protect, deleteTrip);

module.exports = router;
