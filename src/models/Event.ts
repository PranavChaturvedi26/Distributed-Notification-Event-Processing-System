import mongoose, { Schema, Document } from 'mongoose';

export enum EventStatus {
  RECEIVED = 'RECEIVED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum EventType {
  USER_SIGNUP = 'USER_SIGNUP',
  ORDER_PLACED = 'ORDER_PLACED',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PASSWORD_RESET = 'PASSWORD_RESET',
}

export interface IEvent extends Document {
  eventId: string;
  type: EventType;
  userId: string;
  data: Record<string, any>;
  status: EventStatus;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(EventType),
      required: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    data: {
      type: Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(EventStatus),
      default: EventStatus.RECEIVED,
    },
    processedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const Event = mongoose.model<IEvent>('Event', EventSchema);
