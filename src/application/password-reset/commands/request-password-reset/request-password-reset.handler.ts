import { randomBytes, randomUUID } from 'crypto';
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PasswordResetTokenEntity } from '@domain/password-reset/password-reset-token.entity';
import { TOKEN_HASHER } from '@application/_shared/token-hasher.interface';
import type { ITokenHasher } from '@application/_shared/token-hasher.interface';
import { EMAIL_QUEUE } from '@application/_shared/email-queue.interface';
import type { IEmailQueue } from '@application/_shared/email-queue.interface';
import { USER_REPOSITORY } from '@application/user/user-repository.interface';
import type { IUserRepository } from '@application/user/user-repository.interface';
import { PASSWORD_RESET_TOKEN_REPOSITORY } from '@application/password-reset/password-reset-token-repository.interface';
import type { IPasswordResetTokenRepository } from '@application/password-reset/password-reset-token-repository.interface';
import { RequestPasswordResetCommand } from './request-password-reset.command';

export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

@CommandHandler(RequestPasswordResetCommand)
export class RequestPasswordResetHandler implements ICommandHandler<
  RequestPasswordResetCommand,
  void
> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(TOKEN_HASHER) private readonly tokenHasher: ITokenHasher,
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY)
    private readonly passwordResetTokenRepository: IPasswordResetTokenRepository,
    @Inject(EMAIL_QUEUE) private readonly emailQueue: IEmailQueue,
  ) {}

  async execute(command: RequestPasswordResetCommand): Promise<void> {
    const user = await this.userRepository.findByEmail(command.email);

    // Silently no-op when the email doesn't match anyone: the controller
    // always returns 200 either way, so a real vs. fake email must behave
    // identically here too, or timing/behavior would leak which is which.
    if (!user) {
      return;
    }

    const rawToken = randomBytes(32).toString('hex');
    const now = new Date();

    const token = PasswordResetTokenEntity.create({
      id: randomUUID(),
      userId: user.id,
      tokenHash: this.tokenHasher.hash(rawToken),
      expiresAt: new Date(now.getTime() + PASSWORD_RESET_TOKEN_TTL_MS),
      createdAt: now,
    });

    await this.passwordResetTokenRepository.create(token);

    await this.emailQueue.enqueue({
      to: user.email,
      subject: 'Redefinição de senha solicitada',
      body: `Use este token para redefinir sua senha (válido por 1 hora): ${rawToken}`,
    });
  }
}
