export class DeleteRoleCommand {
  constructor(
    readonly roleId: string,
    readonly actorId: string | null = null,
  ) {}
}
