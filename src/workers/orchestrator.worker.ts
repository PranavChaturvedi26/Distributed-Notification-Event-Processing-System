import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { config } from '../config';
import { QUEUE_NAMES, EventJobData, emailQueue, EmailJobData } from '../queues/event.queue';
import { Event, EventStatus, EventType } from '../models/Event';
import { Notification, NotificationChannel, NotificationStatus } from '../models/Notification';
import { preferenceService } from '../services/preference.service';

async function processEvent(job: Job<EventJobData>): Promise<void> {
  const { eventId, type, userId, data } = job.data;

  console.log(`[Orchestrator] Processing event: ${eventId}, type: ${type}`);

  try {
    // Update event status to PROCESSING
    await Event.findOneAndUpdate({ eventId }, { status: EventStatus.PROCESSING });

    // Fetch user preferences to determine notification channels
    const channels = await preferenceService.getNotificationChannels(userId, type as EventType);

    console.log(`[Orchestrator] User ${userId} channels: ${channels.join(', ')}`);

    // Process each channel
    for (const channel of channels) {
      if (channel === NotificationChannel.EMAIL) {
        // Check idempotency - don't create duplicate notifications
        const existingNotification = await Notification.findOne({
          eventId,
          channel: NotificationChannel.EMAIL,
        });

        if (existingNotification) {
          console.log(`[Orchestrator] Email notification already exists for event ${eventId}`);
          continue;
        }

        // Get email template
        const template = preferenceService.getEmailTemplate(type as EventType, data);
        const recipient = data.email || `user-${userId}@example.com`;

        // Create notification record
        const notification = await Notification.create({
          eventId,
          userId,
          channel: NotificationChannel.EMAIL,
          recipient,
          subject: template.subject,
          content: template.content,
          status: NotificationStatus.PENDING,
        });

        // Push to email queue
        const emailJobData: EmailJobData = {
          eventId,
          userId,
          recipient,
          subject: template.subject,
          content: template.content,
        };

        await emailQueue.add(`email-${eventId}`, emailJobData, {
          jobId: `email-${eventId}`,
        });

        console.log(`[Orchestrator] Email job queued for event ${eventId}`);
      }

      if (channel === NotificationChannel.IN_APP) {
        // Check idempotency
        const existingNotification = await Notification.findOne({
          eventId,
          channel: NotificationChannel.IN_APP,
        });

        if (existingNotification) {
          console.log(`[Orchestrator] In-app notification already exists for event ${eventId}`);
          continue;
        }

        // Create in-app notification (simplified - just store in DB)
        await Notification.create({
          eventId,
          userId,
          channel: NotificationChannel.IN_APP,
          recipient: userId,
          content: `Notification for ${type}: ${JSON.stringify(data)}`,
          status: NotificationStatus.SENT,
          sentAt: new Date(),
        });

        console.log(`[Orchestrator] In-app notification created for event ${eventId}`);
      }
    }

    // Update event status to COMPLETED
    await Event.findOneAndUpdate(
      { eventId },
      {
        status: EventStatus.COMPLETED,
        processedAt: new Date(),
      }
    );

    console.log(`[Orchestrator] Event ${eventId} processed successfully`);
  } catch (error) {
    console.error(`[Orchestrator] Error processing event ${eventId}:`, error);

    // Update event status to FAILED
    await Event.findOneAndUpdate({ eventId }, { status: EventStatus.FAILED });

    throw error;
  }
}

export const orchestratorWorker = new Worker<EventJobData>(
  QUEUE_NAMES.EVENT,
  processEvent,
  {
    connection: redisConnection,
    concurrency: config.queue.concurrency,
  }
);

orchestratorWorker.on('completed', (job) => {
  console.log(`[Orchestrator] Job ${job.id} completed`);
});

orchestratorWorker.on('failed', (job, err) => {
  console.error(`[Orchestrator] Job ${job?.id} failed:`, err.message);
});

export default orchestratorWorker;
