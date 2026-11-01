export class AssignPermissionToRoleCommand {
  constructor(
    readonly roleId: string,
    readonly permissionId: string,
  ) {}
}
