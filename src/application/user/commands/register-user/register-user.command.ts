export class RegisterUserCommand {
  constructor(
    readonly name: string,
    readonly email: string,
    readonly password: string,
  ) {}
}
