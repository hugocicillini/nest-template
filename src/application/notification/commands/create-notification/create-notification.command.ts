export class CreateNotificationCommand {
  constructor(
    readonly userId: string,
    readonly type: string,
    readonly title: string,
    readonly message: string,
  ) {}
}
