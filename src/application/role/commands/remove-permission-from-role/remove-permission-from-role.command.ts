export class RemovePermissionFromRoleCommand {
  constructor(
    readonly roleId: string,
    readonly permissionId: string,
  ) {}
}
