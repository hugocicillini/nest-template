import {
  EMAIL_QUEUE,
  type IEmailQueue,
} from '@application/_shared/email-queue.interface';
import {
  TOKEN_HASHER,
  type ITokenHasher,
} from '@application/_shared/token-hasher.interface';
import {
  PASSWORD_BREACH_CHECKER,
  type IPasswordBreachChecker,
} from '@application/_shared/password-breach-checker.interface';
import {
  TRANSACTION_RUNNER,
  type ITransactionRunner,
} from '@application/_shared/transaction-runner.interface';
import type { IPasswordHasher } from '@application/user/password-hasher.interface';
import { PASSWORD_HASHER } from '@application/user/password-hasher.interface';
import type { IUserRepository } from '@application/user/user-repository.interface';
import { USER_REPOSITORY } from '@application/user/user-repository.interface';
import {
  EMAIL_VERIFICATION_TOKEN_REPOSITORY,
  type IEmailVerificationTokenRepository,
} from '@application/email-verification/email-verification-token-repository.interface';
import {
  EmailAlreadyRegisteredException,
  InvalidPasswordException,
} from '@domain/_shared/domain.exception';
import { Email } from '@domain/user/email.vo';
import { Password } from '@domain/user/password.vo';
import { UserEntity } from '@domain/user/user.entity';
import { EmailVerificationTokenEntity } from '@domain/email-verification/email-verification-token.entity';
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomBytes, randomUUID } from 'crypto';
import { RegisterUserCommand } from './register-user.command';

const EMAIL_VERIFICATION_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler implements ICommandHandler<
  RegisterUserCommand,
  { id: string }
> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(EMAIL_QUEUE) private readonly emailQueue: IEmailQueue,
    @Inject(TOKEN_HASHER) private readonly tokenHasher: ITokenHasher,
    @Inject(EMAIL_VERIFICATION_TOKEN_REPOSITORY)
    private readonly emailVerificationTokenRepository: IEmailVerificationTokenRepository,
    @Inject(PASSWORD_BREACH_CHECKER)
    private readonly passwordBreachChecker: IPasswordBreachChecker,
    @Inject(TRANSACTION_RUNNER)
    private readonly transactionRunner: ITransactionRunner,
  ) {}

  async execute(command: RegisterUserCommand): Promise<{ id: string }> {
    const email = Email.create(command.email);

    if (await this.userRepository.emailExists(email.toString())) {
      throw new EmailAlreadyRegisteredException(email.toString());
    }

    Password.validate(command.password);
    if (await this.passwordBreachChecker.isBreached(command.password)) {
      throw new InvalidPasswordException(
        'This password has appeared in a known data breach - choose a different one',
      );
    }
    const passwordHash = await this.passwordHasher.hash(command.password);

    const now = new Date();
    const user = UserEntity.create({
      id: randomUUID(),
      name: command.name,
      email: email.toString(),
      passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    const rawVerificationToken = randomBytes(32).toString('hex');
    const tokenNow = new Date();

    const saved = await this.transactionRunner.run(async (tx) => {
      const savedUser = await this.userRepository.save(user, tx);

      const verificationToken = EmailVerificationTokenEntity.create({
        id: randomUUID(),
        userId: savedUser.id,
        tokenHash: this.tokenHasher.hash(rawVerificationToken),
        expiresAt: new Date(
          tokenNow.getTime() + EMAIL_VERIFICATION_TOKEN_TTL_MS,
        ),
        createdAt: tokenNow,
      });
      await this.emailVerificationTokenRepository.create(verificationToken, tx);

      return savedUser;
    });

    // Queued only after the transaction above commits - a rollback (e.g.
    // the token insert failing) must not leave a "verify your email" job
    // enqueued for a user that was never actually persisted.
    await this.emailQueue.enqueue({
      to: saved.email,
      subject: 'Seu cadastro foi realizado com sucesso!',
      body:
        `Olá ${saved.name}, seu cadastro foi realizado com sucesso! ` +
        `Use este token para verificar seu e-mail (válido por 48 horas): ${rawVerificationToken}`,
    });

    return { id: saved.id };
  }
}
