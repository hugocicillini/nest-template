const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email {
  private constructor(private readonly value: string) {}

  static create(value: string): Email {
    const normalized = value.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalized)) {
      throw new Error(`Invalid email format: "${value}"`);
    }

    return new Email(normalized);
  }

  toString(): string {
    return this.value;
  }
}
