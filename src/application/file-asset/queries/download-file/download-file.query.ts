export class DownloadFileQuery {
  constructor(
    readonly fileAssetId: string,
    readonly userId: string,
  ) {}
}
