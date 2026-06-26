export enum WebhookEventStatus {
    Pending = 'pending',
    Processing = 'processing',
    Delivered = 'delivered',
    Failed = 'failed',
    NoSubscribers = 'no_subscribers',
}

export enum WebhookDeliveryStatus {
    Pending = 'pending',
    Success = 'success',
    Failed = 'failed',
    Retrying = 'retrying',
}