const { calculateCommission, resolveCommissionRate } = require('../src/utils/commissionUtils');

describe('commissionUtils', () => {
  describe('calculateCommission', () => {
    it('calculates commission correctly at standard 15% rate', () => {
      const amount = 10000;
      const rate = 0.15;
      const result = calculateCommission(amount, rate);
      
      expect(result.commissionAmount).toBe(1500);
      expect(result.guideEarning).toBe(8500);
    });

    it('retains two-decimal floating point precision', () => {
      const amount = 99.99;
      const rate = 0.15; // 14.9985 -> rounds to 15.00 commission, 84.99 guide earning
      const result = calculateCommission(amount, rate);
      
      expect(result.commissionAmount).toBe(15.00);
      expect(result.guideEarning).toBe(84.99);
    });

    it('calculates correctly at 0% rate', () => {
      const amount = 5000;
      const rate = 0;
      const result = calculateCommission(amount, rate);
      
      expect(result.commissionAmount).toBe(0);
      expect(result.guideEarning).toBe(5000);
    });

    it('calculates correctly at 100% rate', () => {
      const amount = 5000;
      const rate = 1.0;
      const result = calculateCommission(amount, rate);
      
      expect(result.commissionAmount).toBe(5000);
      expect(result.guideEarning).toBe(0);
    });

    it('throws error for negative booking amount', () => {
      expect(() => calculateCommission(-100, 0.15)).toThrow('bookingAmount must be a non-negative finite number');
    });

    it('throws error for invalid commission rates', () => {
      expect(() => calculateCommission(100, -0.05)).toThrow('commissionRate must be between 0 and 1');
      expect(() => calculateCommission(100, 1.05)).toThrow('commissionRate must be between 0 and 1');
      expect(() => calculateCommission(100, 'abc')).toThrow('commissionRate must be between 0 and 1');
    });
  });

  describe('resolveCommissionRate', () => {
    it('uses guide override rate when provided', () => {
      expect(resolveCommissionRate(0.12, 0.15)).toBe(0.12);
      expect(resolveCommissionRate(0.20, 0.15)).toBe(0.20);
      expect(resolveCommissionRate(0.0, 0.15)).toBe(0.0);
    });

    it('falls back to default rate when override is null or undefined', () => {
      expect(resolveCommissionRate(null, 0.15)).toBe(0.15);
      expect(resolveCommissionRate(undefined, 0.15)).toBe(0.15);
    });

    it('uses platform default fallback when default parameter not explicitly given', () => {
      expect(resolveCommissionRate(null)).toBe(0.15);
    });
  });
});
