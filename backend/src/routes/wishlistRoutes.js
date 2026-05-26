const express = require('express');
const router = express.Router();
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist
} = require('../controllers/wishlistController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getWishlist);
router.post('/:destinationId', protect, addToWishlist);
router.delete('/:destinationId', protect, removeFromWishlist);

module.exports = router;
