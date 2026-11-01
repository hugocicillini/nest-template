import { mock } from 'jest-mock-extended';
import { NotificationEntity } from '@domain/notification/notification.entity';
import { NotificationNotFoundException } from '@domain/_shared/domain.exception';
import type { INotificationRepository } from '@application/notification/notification-repository.interface';
import { MarkNotificationAsReadHandler } from './mark-notification-as-read.handler';
import { MarkNotificationAsReadCommand } from './mark-notification-as-read.command';

describe('MarkNotificationAsReadHandler', () => {
  let notificationRepository: INotificationRepository;
  let handler: MarkNotificationAsReadHandler;

  beforeEach(() => {
    notificationRepository = mock<INotificationRepository>();
    handler = new MarkNotificationAsReadHandler(notificationRepository);
  });

  it('marks the notification as read and saves it when the owner matches', async () => {
    const notification = NotificationEntity.create({
      id: 'notification-1',
      userId: 'user-1',
      type: 'file.uploaded',
      title: 'Arquivo enviado',
      message: 'photo.png foi enviado com sucesso.',
      createdAt: new Date(),
    });
    jest
      .mocked(notificationRepository.findById)
      .mockResolvedValue(notification);

    await handler.execute(
      new MarkNotificationAsReadCommand('notification-1', 'user-1'),
    );

    expect(notification.readAt).not.toBeNull();
    expect(notificationRepository.save).toHaveBeenCalledWith(notification);
  });

  it('throws NotificationNotFoundException when the notification does not exist', async () => {
    jest.mocked(notificationRepository.findById).mockResolvedValue(null);

    await expect(
      handler.execute(
        new MarkNotificationAsReadCommand('missing-notification', 'user-1'),
      ),
    ).rejects.toThrow(NotificationNotFoundException);

    expect(notificationRepository.save).not.toHaveBeenCalled();
  });

  it('throws NotificationNotFoundException (not a different error) when the caller is not the owner', async () => {
    const notification = NotificationEntity.create({
      id: 'notification-1',
      userId: 'user-1',
      type: 'file.uploaded',
      title: 'Arquivo enviado',
      message: 'photo.png foi enviado com sucesso.',
      createdAt: new Date(),
    });
    jest
      .mocked(notificationRepository.findById)
      .mockResolvedValue(notification);

    await expect(
      handler.execute(
        new MarkNotificationAsReadCommand('notification-1', 'someone-else'),
      ),
    ).rejects.toThrow(NotificationNotFoundException);

    expect(notification.readAt).toBeNull();
    expect(notificationRepository.save).not.toHaveBeenCalled();
  });
});
