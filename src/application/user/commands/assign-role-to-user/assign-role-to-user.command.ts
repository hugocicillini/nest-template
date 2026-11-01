export class AssignRoleToUserCommand {
  constructor(
    readonly userId: string,
    readonly roleId: string,
  ) {}
}
