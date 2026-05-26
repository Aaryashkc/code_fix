const express = require('express');
const router = express.Router();
const {
  createPin,
  getMyPins,
  getPublicPins,
  getNearbyPins,
  getPin,
  updatePin,
  deletePin,
  addComment
} = require('../controllers/mapPinController');
const { protect } = require('../middleware/auth');

router.post('/', protect, createPin);
router.get('/my-pins', protect, getMyPins);
router.get('/public', getPublicPins);
router.get('/nearby', getNearbyPins);
router.get('/:id', getPin);
router.put('/:id', protect, updatePin);
router.delete('/:id', protect, deletePin);
router.post('/:id/comments', protect, addComment);

module.exports = router;
