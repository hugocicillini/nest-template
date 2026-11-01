export class DeleteUserCommand {
  constructor(
    readonly userId: string,
    readonly actorId: string | null = null,
  ) {}
}
