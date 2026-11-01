export class RemoveRoleFromUserCommand {
  constructor(
    readonly userId: string,
    readonly roleId: string,
  ) {}
}
