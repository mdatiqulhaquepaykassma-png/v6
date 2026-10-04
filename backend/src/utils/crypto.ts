import crypto from 'crypto';
import { config } from '../config/index.js';

export class CryptoUtil {
  /**
   * Generates a cryptographically secure 64-hex-character server seed (32 bytes)
   */
  public static generateServerSeed(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hashes a server seed using SHA-256 for public commitment
   */
  public static hashServerSeed(serverSeed: string): string {
    return crypto.createHash('sha256').update(serverSeed).digest('hex');
  }

  /**
   * Generates HMAC-SHA512 hex digest
   */
  public static hmacSha512(key: string, data: string): string {
    return crypto.createHmac('sha512', key).update(data).digest('hex');
  }

  /**
   * Generates HMAC-SHA256 hex digest (used for Merchant & Aggregator API)
   */
  public static hmacSha256(secret: string, data: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Encrypts sensitive string data using AES-256-GCM
   */
  public static encryptSensitive(text: string, customKey?: string): string {
    const key = Buffer.from(customKey || config.security.sensitiveDataEncryptionKey, 'hex');
    const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypts sensitive string data using AES-256-GCM
   */
  public static decryptSensitive(cipherPayload: string, customKey?: string): string {
    const parts = cipherPayload.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid cipher payload format');
    }
    const [ivHex, authTagHex, encryptedText] = parts;
    const key = Buffer.from(customKey || config.security.sensitiveDataEncryptionKey, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Verifies Merchant request signature
   */
  public static verifyMerchantSignature(
    secret: string,
    timestamp: number | string,
    method: string,
    path: string,
    body: unknown,
    providedSignature: string
  ): boolean {
    const bodyString = body ? JSON.stringify(body) : '';
    const payload = `${timestamp}${method.toUpperCase()}${path}${bodyString}`;
    const calculatedSignature = this.hmacSha256(secret, payload);
    
    if (calculatedSignature.length !== providedSignature.length) {
      return false;
    }
    return crypto.timingSafeEqual(
      Buffer.from(calculatedSignature),
      Buffer.from(providedSignature)
    );
  }
}
