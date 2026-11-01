export class UpdateUserCommand {
  constructor(
    readonly userId: string,
    readonly name?: string,
    readonly email?: string,
    readonly active?: boolean,
  ) {}
}
