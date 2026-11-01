export interface NotificationProps {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  readAt: Date | null;
  createdAt: Date;
}

export interface CreateNotificationProps {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  createdAt: Date;
}

export class NotificationEntity {
  readonly id: string;
  readonly userId: string;
  readonly type: string;
  readonly title: string;
  readonly message: string;
  readAt: Date | null;
  readonly createdAt: Date;

  private constructor(props: NotificationProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.type = props.type;
    this.title = props.title;
    this.message = props.message;
    this.readAt = props.readAt;
    this.createdAt = props.createdAt;
  }

  static create(props: CreateNotificationProps): NotificationEntity {
    return new NotificationEntity({ ...props, readAt: null });
  }

  static reconstitute(props: NotificationProps): NotificationEntity {
    return new NotificationEntity(props);
  }

  markAsRead(): void {
    this.readAt = new Date();
  }
}
