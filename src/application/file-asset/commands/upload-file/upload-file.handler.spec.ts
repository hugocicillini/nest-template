import { mock } from 'jest-mock-extended';
import { InvalidFileTypeException } from '@domain/_shared/domain.exception';
import type { IFileStorage } from '@application/file-asset/file-storage.interface';
import type { IFileAssetRepository } from '@application/file-asset/file-asset-repository.interface';
import type { INotificationQueue } from '@application/_shared/notification-queue.interface';
import { UploadFileHandler } from './upload-file.handler';
import { UploadFileCommand } from './upload-file.command';

// A real, complete 1x1 transparent PNG — file-type's PNG detector reads
// past the signature into the IHDR/IDAT chunks, so a bare 8-byte signature
// isn't enough to be classified. The handler's own `import('file-type')` is
// a genuine ESM dynamic import (see its comment), so these specs run under
// `--experimental-vm-modules` (see the "test" script) and exercise the real
// detection logic rather than mocking it.
const PNG_HEADER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

describe('UploadFileHandler', () => {
  let fileStorage: IFileStorage;
  let fileAssetRepository: IFileAssetRepository;
  let notificationQueue: INotificationQueue;
  let handler: UploadFileHandler;

  beforeEach(() => {
    fileStorage = mock<IFileStorage>();
    fileAssetRepository = mock<IFileAssetRepository>();
    notificationQueue = mock<INotificationQueue>();
    handler = new UploadFileHandler(
      fileStorage,
      fileAssetRepository,
      notificationQueue,
    );
  });

  it('saves the file and enqueues a notification when the detected type is allowed', async () => {
    jest
      .mocked(fileAssetRepository.create)
      .mockImplementation((fileAsset) => Promise.resolve(fileAsset));

    const result = await handler.execute(
      new UploadFileCommand(
        'photo.png',
        'image/png',
        PNG_HEADER.length,
        PNG_HEADER,
        'user-1',
      ),
    );

    expect(fileStorage.save).toHaveBeenCalledWith(
      expect.any(String),
      PNG_HEADER,
    );
    const storedEntity = jest.mocked(fileAssetRepository.create).mock
      .calls[0][0];
    expect(storedEntity.fileName).toBe('photo.png');
    expect(result.fileName).toBe('photo.png');
    expect(notificationQueue.enqueue).toHaveBeenCalledWith({
      userId: 'user-1',
      type: 'file.uploaded',
      title: 'Arquivo enviado',
      message: 'photo.png foi enviado com sucesso.',
    });
  });

  it('does not enqueue a notification when uploadedBy is null', async () => {
    jest
      .mocked(fileAssetRepository.create)
      .mockImplementation((fileAsset) => Promise.resolve(fileAsset));

    await handler.execute(
      new UploadFileCommand(
        'photo.png',
        'image/png',
        PNG_HEADER.length,
        PNG_HEADER,
        null,
      ),
    );

    expect(notificationQueue.enqueue).not.toHaveBeenCalled();
  });

  it('throws InvalidFileTypeException and saves nothing when the bytes are not a recognizable type', async () => {
    const garbage = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);

    await expect(
      handler.execute(
        new UploadFileCommand(
          'mystery.bin',
          'application/octet-stream',
          garbage.length,
          garbage,
        ),
      ),
    ).rejects.toThrow(InvalidFileTypeException);

    expect(fileStorage.save).not.toHaveBeenCalled();
    expect(fileAssetRepository.create).not.toHaveBeenCalled();
    expect(notificationQueue.enqueue).not.toHaveBeenCalled();
  });

  it('throws InvalidFileTypeException when the detected type is not in the allowlist', async () => {
    // "PK\x03\x04" — a real, detectable magic number (zip/office/apk/etc.)
    // that is deliberately not in the handler's allowlist.
    const zipHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);

    await expect(
      handler.execute(
        new UploadFileCommand(
          'archive.zip',
          'application/zip',
          zipHeader.length,
          zipHeader,
        ),
      ),
    ).rejects.toThrow(InvalidFileTypeException);

    expect(fileStorage.save).not.toHaveBeenCalled();
  });
});
