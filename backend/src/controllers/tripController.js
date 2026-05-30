const Trip = require('../models/Trip');
const { estimateRouteDistanceKm, greedyOptimizeTripPlaces } = require('../utils/routeOptimizer');

function normalizeTripPlaces(places) {
  return places
    .filter((place) => place && place.destination)
    .map((place, index) => ({
      destination: place.destination,
      day: Number(place.day) > 0 ? Number(place.day) : 1,
      order: Number.isInteger(place.order) ? place.order : index
    }))
    .sort((a, b) => (a.day - b.day) || (a.order - b.order));
}

function populateTrip(tripId) {
  return Trip.findById(tripId)
    .populate('places.destination', 'name images location category duration rating shortDescription')
    .lean();
}

// @desc    Create a new trip
// @route   POST /api/trips
// @access  Private
exports.createTrip = async (req, res) => {
  try {
    const { name, places } = req.body;
    const normalizedName = String(name || '').trim();

    if (!normalizedName || !places || !Array.isArray(places) || places.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a trip name and at least one place'
      });
    }

    const normalizedPlaces = normalizeTripPlaces(places);
    if (normalizedPlaces.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid trip places'
      });
    }

    const trip = await Trip.create({
      user: req.user.id,
      name: normalizedName,
      places: normalizedPlaces
    });

    const populatedTrip = await populateTrip(trip._id);

    res.status(201).json({
      success: true,
      message: 'Trip saved successfully',
      data: populatedTrip
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update an existing trip
// @route   PUT /api/trips/:id
// @access  Private
exports.updateTrip = async (req, res) => {
  try {
    const { name, places } = req.body;
    const normalizedName = String(name || '').trim();

    if (!normalizedName || !places || !Array.isArray(places) || places.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a trip name and at least one place'
      });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    if (trip.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const normalizedPlaces = normalizeTripPlaces(places);
    if (normalizedPlaces.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid trip places'
      });
    }

    trip.name = normalizedName;
    trip.places = normalizedPlaces;
    await trip.save();

    const populatedTrip = await populateTrip(trip._id);

    res.status(200).json({
      success: true,
      message: 'Trip updated successfully',
      data: populatedTrip
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get my trips
// @route   GET /api/trips
// @access  Private
exports.getMyTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ user: req.user.id })
      .populate('places.destination', 'name images location category duration')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: trips.length,
      data: trips
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete a trip
// @route   DELETE /api/trips/:id
// @access  Private
exports.deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    if (trip.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    await trip.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Trip deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Optimize trip route
// @route   POST /api/trips/:id/optimize
// @access  Private
exports.optimizeTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('places.destination', 'name images location category duration rating shortDescription');

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found',
      });
    }

    if (trip.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    const optimizedPlaces = greedyOptimizeTripPlaces(trip.places);
    const optimizedTripDistance = estimateRouteDistanceKm(
      optimizedPlaces.map((place) => {
        const matchingPlace = trip.places.find(
          (entry) => String(entry.destination?._id || entry.destination) === String(place.destination)
        );
        return matchingPlace;
      })
    );

    trip.places = optimizedPlaces.map((place, index) => ({
      destination: place.destination,
      day: index + 1,
      order: index,
    }));
    await trip.save();

    const populatedTrip = await populateTrip(trip._id);

    res.status(200).json({
      success: true,
      message: 'Trip route optimized successfully',
      data: populatedTrip,
      meta: {
        estimatedDistanceKm: optimizedTripDistance,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to optimize trip route',
      error: error.message,
    });
  }
};

// @desc    Add a snack stop to a trip
// @route   POST /api/trips/:id/snack-stops
// @access  Private
exports.addSnackStop = async (req, res) => {
  try {
    const { name, lat, lng, type, overpassId, orderAlongRoute } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Snack stop name is required' });
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ success: false, message: 'Valid lat/lng coordinates are required' });
    }
    if (type && !['cafe', 'fast_food', 'restaurant', 'hotel', 'guest_house', 'hostel'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be cafe, fast_food, restaurant, hotel, guest_house, or hostel'
      });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    if (trip.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Prevent duplicate overpass IDs
    if (overpassId && trip.snackStops.some(s => s.overpassId === overpassId)) {
      return res.status(400).json({ success: false, message: 'This snack stop is already added' });
    }

    // Limit snack stops to 20 per trip
    if (trip.snackStops.length >= 20) {
      return res.status(400).json({ success: false, message: 'Maximum 20 snack stops per trip' });
    }

    trip.snackStops.push({
      name: name.trim(),
      lat,
      lng,
      type: type || 'restaurant',
      overpassId: overpassId || null,
      orderAlongRoute: Number.isFinite(orderAlongRoute) ? orderAlongRoute : trip.snackStops.length
    });

    // Re-sort by route order
    trip.snackStops.sort((a, b) => a.orderAlongRoute - b.orderAlongRoute);

    await trip.save();

    const populatedTrip = await populateTrip(trip._id);

    res.status(200).json({
      success: true,
      message: 'Snack stop added',
      data: populatedTrip
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Remove a snack stop from a trip
// @route   DELETE /api/trips/:id/snack-stops/:stopIndex
// @access  Private
exports.removeSnackStop = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    if (trip.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const stopIndex = parseInt(req.params.stopIndex, 10);
    if (!Number.isInteger(stopIndex) || stopIndex < 0 || stopIndex >= trip.snackStops.length) {
      return res.status(400).json({ success: false, message: 'Invalid stop index' });
    }

    trip.snackStops.splice(stopIndex, 1);
    await trip.save();

    const populatedTrip = await populateTrip(trip._id);

    res.status(200).json({
      success: true,
      message: 'Snack stop removed',
      data: populatedTrip
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
