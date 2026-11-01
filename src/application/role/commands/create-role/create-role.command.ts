export class CreateRoleCommand {
  constructor(
    readonly name: string,
    readonly description?: string,
  ) {}
}
