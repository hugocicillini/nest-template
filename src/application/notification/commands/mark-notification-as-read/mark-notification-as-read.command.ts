export class MarkNotificationAsReadCommand {
  constructor(
    readonly notificationId: string,
    readonly userId: string,
  ) {}
}
