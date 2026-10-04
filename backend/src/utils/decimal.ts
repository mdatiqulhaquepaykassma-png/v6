import Decimal from 'decimal.js';

// Configure Decimal.js for high-precision financial operations
Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -18,
  toExpPos: 28,
});

export class DecimalUtil {
  public static from(val: string | number | Decimal): Decimal {
    return new Decimal(val);
  }

  /**
   * Rounds player payouts DOWN (floor to 2 decimal places) to prevent financial leakage
   */
  public static floorPayout(amount: string | number | Decimal): Decimal {
    return new Decimal(amount).toDecimalPlaces(2, Decimal.ROUND_FLOOR);
  }

  /**
   * Rounds company commissions UP (ceil to 2 decimal places) to protect operator revenue
   */
  public static ceilFee(amount: string | number | Decimal): Decimal {
    return new Decimal(amount).toDecimalPlaces(2, Decimal.ROUND_CEIL);
  }

  /**
   * Standard 2 decimal formatting
   */
  public static toFixed2(amount: string | number | Decimal): string {
    return new Decimal(amount).toFixed(2);
  }

  /**
   * Adds two amounts
   */
  public static add(a: string | number | Decimal, b: string | number | Decimal): Decimal {
    return new Decimal(a).plus(new Decimal(b));
  }

  /**
   * Subtracts b from a (a - b)
   */
  public static sub(a: string | number | Decimal, b: string | number | Decimal): Decimal {
    return new Decimal(a).minus(new Decimal(b));
  }

  /**
   * Multiplies a by b
   */
  public static mul(a: string | number | Decimal, b: string | number | Decimal): Decimal {
    return new Decimal(a).times(new Decimal(b));
  }

  /**
   * Divides a by b
   */
  public static div(a: string | number | Decimal, b: string | number | Decimal): Decimal {
    return new Decimal(a).dividedBy(new Decimal(b));
  }

  /**
   * Returns true if a is greater than or equal to b
   */
  public static gte(a: string | number | Decimal, b: string | number | Decimal): boolean {
    return new Decimal(a).greaterThanOrEqualTo(new Decimal(b));
  }

  /**
   * Returns true if a is strictly greater than b
   */
  public static gt(a: string | number | Decimal, b: string | number | Decimal): boolean {
    return new Decimal(a).greaterThan(new Decimal(b));
  }

  /**
   * Returns true if a is equal to b
   */
  public static eq(a: string | number | Decimal, b: string | number | Decimal): boolean {
    return new Decimal(a).equals(new Decimal(b));
  }
}
