export interface DeliverWebhookV1 {
  version: 1;
  attemptId: string;
  event: {
    id: string;
    userId: string;
    type: string;
    payload: Record<string, unknown>;
    createdAt: string;
  };
  subscription: {
    id: string;
    userId: string;
    url: string;
    secret: string;
  };
}

export type DeliverWebhookCommand = DeliverWebhookV1;

export function isDeliverWebhookV1(
  value: unknown,
): value is DeliverWebhookV1 {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const command = value as Partial<DeliverWebhookV1>;
  return (
    command.version === 1 &&
    typeof command.attemptId === 'string' &&
    !!command.event &&
    typeof command.event.id === 'string' &&
    typeof command.event.userId === 'string' &&
    typeof command.event.type === 'string' &&
    !!command.event.payload &&
    typeof command.event.payload === 'object' &&
    typeof command.event.createdAt === 'string' &&
    !!command.subscription &&
    typeof command.subscription.id === 'string' &&
    typeof command.subscription.userId === 'string' &&
    typeof command.subscription.url === 'string' &&
    typeof command.subscription.secret === 'string'
  );
}
