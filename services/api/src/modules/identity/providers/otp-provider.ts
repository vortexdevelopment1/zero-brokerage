export interface OtpDeliveryProvider {
  sendOtp(phone: string, code: string, purpose: string): Promise<boolean>;
}

/**
 * In-memory mock OTP delivery provider for testing and development.
 * Allows retrieving the sent OTP code programmatically in automated test environments.
 */
export class MockOtpDeliveryProvider implements OtpDeliveryProvider {
  private lastCodes = new Map<string, string>();

  async sendOtp(
    phone: string,
    code: string,
    _purpose: string,
  ): Promise<boolean> {
    this.lastCodes.set(phone, code);
    return true;
  }

  getLastCode(phone: string): string | undefined {
    return this.lastCodes.get(phone);
  }

  getLastOtp(phone: string): string | undefined {
    return this.getLastCode(phone);
  }

  clear(): void {
    this.lastCodes.clear();
  }
}
