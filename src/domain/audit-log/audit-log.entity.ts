export interface AuditLogProps {
  id: string;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export class AuditLogEntity {
  readonly id: string;
  readonly actorId: string | null;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string | null;
  readonly metadata: Record<string, unknown> | null;
  readonly createdAt: Date;

  private constructor(props: AuditLogProps) {
    this.id = props.id;
    this.actorId = props.actorId;
    this.action = props.action;
    this.resourceType = props.resourceType;
    this.resourceId = props.resourceId;
    this.metadata = props.metadata;
    this.createdAt = props.createdAt;
  }

  static create(props: AuditLogProps): AuditLogEntity {
    return new AuditLogEntity(props);
  }

  static reconstitute(props: AuditLogProps): AuditLogEntity {
    return new AuditLogEntity(props);
  }
}
