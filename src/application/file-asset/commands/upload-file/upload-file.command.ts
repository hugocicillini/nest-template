export class UploadFileCommand {
  constructor(
    readonly fileName: string,
    readonly mimeType: string,
    readonly size: number,
    readonly buffer: Buffer,
    readonly uploadedBy: string | null = null,
  ) {}
}
