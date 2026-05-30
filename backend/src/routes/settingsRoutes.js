const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getSettings, updateSettings } = require('../controllers/settingsController');

// All settings routes are admin-only
router.use(protect, authorize('admin'));

router.route('/')
  .get(getSettings)
  .put(updateSettings);

module.exports = router;
