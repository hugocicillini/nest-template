export class DeleteFileCommand {
  constructor(
    readonly fileAssetId: string,
    readonly actorId: string | null = null,
  ) {}
}
