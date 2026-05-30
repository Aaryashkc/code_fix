const {
  assertLiveTripActive,
  LIVE_TRIP_ACTIVE_STATUS,
} = require('../src/utils/liveTripAccess');

describe('live trip access rules', () => {
  test('allows confirmed bookings for live sharing', () => {
    expect(() => assertLiveTripActive({ status: LIVE_TRIP_ACTIVE_STATUS })).not.toThrow();
  });

  test('rejects completed bookings for live sharing', () => {
    expect(() => assertLiveTripActive({ status: 'completed' })).toThrow(
      'Live trip sharing is only available for confirmed active bookings'
    );
  });
});
