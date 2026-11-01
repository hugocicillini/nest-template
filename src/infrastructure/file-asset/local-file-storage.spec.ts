import { LocalFileStorage } from './local-file-storage';

async function readStreamToBuffer(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

describe('LocalFileStorage', () => {
  let storage: LocalFileStorage;

  beforeEach(() => {
    storage = new LocalFileStorage();
  });

  describe('path confinement', () => {
    it('rejects a storageKey that attempts to escape the upload directory', async () => {
      await expect(
        storage.save('../../../../etc/cron.d/evil', Buffer.from('x')),
      ).rejects.toThrow(/resolves outside the upload directory/);
    });

    it('rejects an absolute path used as storageKey', async () => {
      const absolute =
        process.platform === 'win32' ? 'C:\\Windows\\evil.txt' : '/etc/passwd';

      await expect(storage.createReadStream(absolute)).rejects.toThrow(
        /resolves outside the upload directory/,
      );
    });
  });

  describe('save/createReadStream/delete round trip', () => {
    const storageKey = '2024-01-01T00-00-00-000Z-photo.png';

    afterEach(async () => {
      await storage.delete(storageKey);
    });

    it('streams back exactly what was saved, without buffering the whole file up front', async () => {
      const original = Buffer.from('the-actual-file-bytes');
      await storage.save(storageKey, original);

      const stream = await storage.createReadStream(storageKey);
      const roundTripped = await readStreamToBuffer(stream);

      expect(roundTripped).toEqual(original);
    });

    it('rejects when the underlying file does not exist', async () => {
      await expect(
        storage.createReadStream('never-saved.png'),
      ).rejects.toThrow();
    });
  });
});
