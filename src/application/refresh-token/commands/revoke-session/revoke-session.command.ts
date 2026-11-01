export class RevokeSessionCommand {
  constructor(
    readonly sessionId: string,
    readonly userId: string,
  ) {}
}
