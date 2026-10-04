import { v4 as uuidv4 } from 'uuid';

export class HelperUtil {
  /**
   * Generates a unique UUID v4
   */
  public static uuid(): string {
    return uuidv4();
  }

  /**
   * Generates an alphanumeric referral code of specified length
   */
  public static generateReferralCode(length = 8): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous 0/O, 1/I
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Formats ISO timestamp
   */
  public static nowISO(): string {
    return new Date().toISOString();
  }

  /**
   * Async sleep delay
   */
  public static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * BigInt serializer for JSON.stringify
   */
  public static serializeBigInt<T>(data: T): T {
    return JSON.parse(
      JSON.stringify(data, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );
  }
}
