const {
  estimateRouteDistanceKm,
  greedyOptimizeTripPlaces,
  haversineDistanceKm,
} = require('../src/utils/routeOptimizer');

const makePlace = (id, lat, lng) => ({
  destination: {
    _id: id,
    location: {
      coordinates: [lng, lat],
    },
  },
});

describe('routeOptimizer', () => {
  it('calculates realistic haversine distances', () => {
    const kathmandu = { lat: 27.7172, lng: 85.324 };
    const pokhara = { lat: 28.2096, lng: 83.9856 };

    expect(haversineDistanceKm(kathmandu, pokhara)).toBeGreaterThan(140);
    expect(haversineDistanceKm(kathmandu, pokhara)).toBeLessThan(150);
  });

  it('orders stops by nearest next destination and resets day/order fields', () => {
    const kathmandu = makePlace('kathmandu', 27.7172, 85.324);
    const lumbini = makePlace('lumbini', 27.6792, 83.507);
    const pokhara = makePlace('pokhara', 28.2096, 83.9856);

    const optimized = greedyOptimizeTripPlaces([kathmandu, lumbini, pokhara]);

    expect(optimized.map((place) => String(place.destination))).toEqual([
      'kathmandu',
      'pokhara',
      'lumbini',
    ]);
    expect(optimized.map((place) => place.day)).toEqual([1, 2, 3]);
    expect(optimized.map((place) => place.order)).toEqual([0, 1, 2]);
  });

  it('estimates total route distance from ordered stops', () => {
    const distance = estimateRouteDistanceKm([
      makePlace('kathmandu', 27.7172, 85.324),
      makePlace('pokhara', 28.2096, 83.9856),
      makePlace('lumbini', 27.6792, 83.507),
    ]);

    expect(distance).toBeGreaterThan(210);
    expect(distance).toBeLessThan(225);
  });
});
