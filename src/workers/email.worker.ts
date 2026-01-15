import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { config } from '../config';
import { QUEUE_NAMES, EmailJobData } from '../queues/event.queue';
import { Notification, NotificationStatus } from '../models/Notification';
import { FailedNotification } from '../models/FailedNotification';

// Simulate random failure for testing retry mechanism
const FAILURE_RATE = 0.2; // 20% chance of failure

async function sendEmail(job: Job<EmailJobData>): Promise<void> {
  const { eventId, userId, recipient, subject, content } = job.data;
  const attemptNumber = job.attemptsMade + 1;

  console.log(`[Email Worker] Attempt ${attemptNumber}: Sending email to ${recipient}`);
  console.log(`[Email Worker] Subject: ${subject}`);

  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Simulate random failure for retry testing
  if (Math.random() < FAILURE_RATE) {
    console.log(`[Email Worker] Simulated failure for email to ${recipient}`);
    throw new Error('Simulated email sending failure');
  }

  // Update notification status
  await Notification.findOneAndUpdate(
    { eventId, channel: 'EMAIL' },
    {
      status: NotificationStatus.SENT,
      sentAt: new Date(),
      attempts: attemptNumber,
    }
  );

  console.log(`[Email Worker] Successfully sent email to ${recipient}`);
}

export const emailWorker = new Worker<EmailJobData>(
  QUEUE_NAMES.EMAIL,
  sendEmail,
  {
    connection: redisConnection,
    concurrency: config.queue.concurrency,
  }
);

emailWorker.on('completed', (job) => {
  console.log(`[Email Worker] Job ${job.id} completed successfully`);
});

emailWorker.on('failed', async (job, err) => {
  if (!job) return;

  const attemptsMade = job.attemptsMade;
  const maxAttempts = job.opts.attempts || config.queue.maxRetries;

  console.error(`[Email Worker] Job ${job.id} failed (attempt ${attemptsMade}/${maxAttempts}):`, err.message);

  // If this was the final attempt, move to DLQ
  if (attemptsMade >= maxAttempts) {
    console.log(`[Email Worker] Moving job ${job.id} to Dead Letter Queue`);

    const { eventId, userId, recipient, subject, content } = job.data;

    try {
      // Update notification status to DLQ
      await Notification.findOneAndUpdate(
        { eventId, channel: 'EMAIL' },
        {
          status: NotificationStatus.DLQ,
          lastError: err.message,
          attempts: attemptsMade,
        }
      );

      // Store in failed_notifications collection (DLQ)
      await FailedNotification.create({
        eventId,
        userId,
        channel: 'EMAIL',
        recipient,
        subject,
        content,
        errorReason: err.message,
        failedAt: new Date(),
        originalJobId: job.id || '',
        attempts: attemptsMade,
      });

      console.log(`[Email Worker] Job ${job.id} moved to DLQ`);
    } catch (dlqError) {
      console.error(`[Email Worker] Error moving job to DLQ:`, dlqError);
    }
  } else {
    // Update attempt count
    await Notification.findOneAndUpdate(
      { eventId: job.data.eventId, channel: 'EMAIL' },
      {
        attempts: attemptsMade,
        lastError: err.message,
      }
    );
  }
});

export default emailWorker;
