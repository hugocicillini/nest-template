export class CreatePermissionCommand {
  constructor(
    readonly name: string,
    readonly description?: string,
  ) {}
}
