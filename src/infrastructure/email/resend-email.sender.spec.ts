import { ResendEmailSender } from './resend-email.sender';
import { ConfigService } from '@nestjs/config';

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
    const config = {
      get: jest.fn((key: string) =>
        key === 'RESEND_API_KEY' ? 're_test_key' : 'test@example.com',
      ),
    } as unknown as ConfigService;
    sender = new ResendEmailSender(config);
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
