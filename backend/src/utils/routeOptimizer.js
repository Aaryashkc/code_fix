function haversineDistanceKm(from, to) {
  if (!from || !to) return Number.POSITIVE_INFINITY;

  const earthRadiusKm = 6371;
  const toRadians = (value) => (value * Math.PI) / 180;
  const deltaLat = toRadians((to.lat || 0) - (from.lat || 0));
  const deltaLng = toRadians((to.lng || 0) - (from.lng || 0));
  const fromLat = toRadians(from.lat || 0);
  const toLat = toRadians(to.lat || 0);

  const a = (
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2
  );

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function extractCoordinates(place) {
  const coordinates = place?.destination?.location?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  const [lng, lat] = coordinates;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

function toPlainPlace(place, index) {
  return {
    destination: place?.destination?._id || place?.destination,
    day: Number(place?.day) > 0 ? Number(place.day) : index + 1,
    order: Number.isInteger(place?.order) ? place.order : index,
    coordinates: extractCoordinates(place),
  };
}

function greedyOptimizeTripPlaces(places = []) {
  const normalized = places.map((place, index) => toPlainPlace(place, index));
  const placesWithCoordinates = normalized.filter((place) => place.coordinates);
  const placesWithoutCoordinates = normalized.filter((place) => !place.coordinates);

  if (placesWithCoordinates.length <= 1) {
    return normalized.map((place, index) => ({
      destination: place.destination,
      day: index + 1,
      order: index,
    }));
  }

  const orderedPlaces = [placesWithCoordinates[0]];
  const remainingPlaces = placesWithCoordinates.slice(1);

  while (remainingPlaces.length > 0) {
    const currentPlace = orderedPlaces[orderedPlaces.length - 1];
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < remainingPlaces.length; index += 1) {
      const distance = haversineDistanceKm(currentPlace.coordinates, remainingPlaces[index].coordinates);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    }

    const [nextPlace] = remainingPlaces.splice(nearestIndex, 1);
    orderedPlaces.push(nextPlace);
  }

  return [...orderedPlaces, ...placesWithoutCoordinates].map((place, index) => ({
    destination: place.destination,
    day: index + 1,
    order: index,
  }));
}

function estimateRouteDistanceKm(places = []) {
  const coordinates = places
    .map((place) => extractCoordinates(place) || place.coordinates || null)
    .filter(Boolean);

  if (coordinates.length < 2) {
    return 0;
  }

  let distance = 0;
  for (let index = 1; index < coordinates.length; index += 1) {
    distance += haversineDistanceKm(coordinates[index - 1], coordinates[index]);
  }

  return Math.round(distance * 10) / 10;
}

module.exports = {
  estimateRouteDistanceKm,
  greedyOptimizeTripPlaces,
  haversineDistanceKm,
};
