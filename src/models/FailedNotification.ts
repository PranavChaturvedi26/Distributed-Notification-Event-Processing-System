import mongoose, { Schema, Document } from 'mongoose';
import { NotificationChannel } from './Notification';

export interface IFailedNotification extends Document {
  eventId: string;
  userId: string;
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  content: string;
  errorReason: string;
  failedAt: Date;
  originalJobId: string;
  attempts: number;
  createdAt: Date;
}

const FailedNotificationSchema = new Schema<IFailedNotification>(
  {
    eventId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
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
    errorReason: {
      type: String,
      required: true,
    },
    failedAt: {
      type: Date,
      required: true,
    },
    originalJobId: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const FailedNotification = mongoose.model<IFailedNotification>(
  'FailedNotification',
  FailedNotificationSchema
);
