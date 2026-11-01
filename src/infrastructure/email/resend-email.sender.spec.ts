import { ResendEmailSender } from './resend-email.sender';

/**
 * resend-email.sender.ts builds its Resend client as a module-level
 * constant, not a DI-injected dependency (matches s3-file-storage.ts's
 * pattern for SDK clients). The mock's send() must exist before that
 * constant is constructed - which happens the moment this file's import of
 * ResendEmailSender resolves, before any code below the jest.mock() call
 * runs - so it's created inside the factory itself and exposed via a named
 * export, instead of closing over an outer variable (which would still be
 * undefined at that point).
 */
jest.mock('resend', () => {
  const mockSend = jest.fn();
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: { send: mockSend },
    })),
    __mockSend: mockSend,
  };
});

const mockResendModule: { __mockSend: jest.Mock } = jest.requireMock('resend');
const { __mockSend: mockSend } = mockResendModule;

describe('ResendEmailSender', () => {
  let sender: ResendEmailSender;

  beforeEach(() => {
    mockSend.mockReset();
    sender = new ResendEmailSender();
  });

  it('resolves when Resend reports no error', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-1' }, error: null });

    await expect(
      sender.send('user@example.com', 'Subject', 'Body'),
    ).resolves.toBeUndefined();
  });

  it('throws when Resend reports an error, so BullMQ retries instead of treating it as delivered', async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: {
        message: 'Invalid from address',
        statusCode: 422,
        name: 'invalid_from_address',
      },
    });

    await expect(
      sender.send('user@example.com', 'Subject', 'Body'),
    ).rejects.toThrow('Invalid from address');
  });
});
