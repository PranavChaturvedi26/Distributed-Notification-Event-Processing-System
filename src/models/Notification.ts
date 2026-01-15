import mongoose, { Schema, Document } from 'mongoose';

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  DLQ = 'DLQ',
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP',
}

export interface INotification extends Document {
  eventId: string;
  userId: string;
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  content: string;
  status: NotificationStatus;
  attempts: number;
  lastError?: string;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    eventId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: Object.values(NotificationChannel),
      required: true,
    },
    recipient: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
    },
    content: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(NotificationStatus),
      default: NotificationStatus.PENDING,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastError: {
      type: String,
    },
    sentAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for idempotency check
NotificationSchema.index({ eventId: 1, channel: 1 }, { unique: true });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
