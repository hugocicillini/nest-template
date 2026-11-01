export class DeletePermissionCommand {
  constructor(
    readonly permissionId: string,
    readonly actorId: string | null = null,
  ) {}
}
