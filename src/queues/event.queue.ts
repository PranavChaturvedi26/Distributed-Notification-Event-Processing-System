import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';
import { config } from '../config';

export const QUEUE_NAMES = {
  EVENT: 'event_queue',
  EMAIL: 'email_queue',
  IN_APP: 'in_app_queue',
} as const;

// Event Queue - receives raw events for orchestration
export const eventQueue = new Queue(QUEUE_NAMES.EVENT, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: config.queue.maxRetries,
    backoff: config.queue.backoff,
    removeOnComplete: {
      count: 1000,
      age: 24 * 3600,
    },
    removeOnFail: false,
  },
});

// Email Queue - receives email notification jobs
export const emailQueue = new Queue(QUEUE_NAMES.EMAIL, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: config.queue.maxRetries,
    backoff: config.queue.backoff,
    removeOnComplete: {
      count: 1000,
      age: 24 * 3600,
    },
    removeOnFail: false,
  },
});

// In-App Queue - receives in-app notification jobs
export const inAppQueue = new Queue(QUEUE_NAMES.IN_APP, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: config.queue.maxRetries,
    backoff: config.queue.backoff,
    removeOnComplete: {
      count: 1000,
      age: 24 * 3600,
    },
    removeOnFail: false,
  },
});

export interface EventJobData {
  eventId: string;
  type: string;
  userId: string;
  data: Record<string, any>;
}

export interface EmailJobData {
  eventId: string;
  userId: string;
  recipient: string;
  subject: string;
  content: string;
}

export interface InAppJobData {
  eventId: string;
  userId: string;
  content: string;
}
