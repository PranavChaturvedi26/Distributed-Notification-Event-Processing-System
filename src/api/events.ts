import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Event, EventStatus, EventType } from '../models/Event';
import { eventQueue, EventJobData } from '../queues/event.queue';

const router = Router();

// Validation schema using Zod
const createEventSchema = z.object({
  eventId: z.string().uuid().optional(),
  type: z.enum([
    EventType.USER_SIGNUP,
    EventType.ORDER_PLACED,
    EventType.PAYMENT_SUCCESS,
    EventType.PASSWORD_RESET,
  ]),
  userId: z.string().min(1),
  data: z.record(z.any()),
});

// POST /events - Event Ingestion Endpoint
router.post('/', async (req: Request, res: Response) => {
  try {
    // 1. Validate request
    const validationResult = createEventSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
    }

    const { type, userId, data } = validationResult.data;
    const eventId = validationResult.data.eventId || uuidv4();

    // 2. Idempotency check - check if event already exists
    const existingEvent = await Event.findOne({ eventId });
    if (existingEvent) {
      return res.status(200).json({
        success: true,
        message: 'Event already processed (idempotent)',
        data: {
          eventId: existingEvent.eventId,
          status: existingEvent.status,
        },
      });
    }

    // 3. Store event in MongoDB with status RECEIVED
    const event = await Event.create({
      eventId,
      type,
      userId,
      data,
      status: EventStatus.RECEIVED,
    });

    // 4. Push event to queue for async processing
    const jobData: EventJobData = {
      eventId,
      type,
      userId,
      data,
    };

    await eventQueue.add(`event-${eventId}`, jobData, {
      jobId: eventId,
    });

    console.log(`Event ${eventId} received and queued for processing`);

    // 5. Return response
    return res.status(202).json({
      success: true,
      message: 'Event received and queued for processing',
      data: {
        eventId: event.eventId,
        status: event.status,
      },
    });
  } catch (error) {
    console.error('Error processing event:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// GET /events/:eventId - Get event status
router.get('/:eventId', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findOne({ eventId });
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        eventId: event.eventId,
        type: event.type,
        userId: event.userId,
        status: event.status,
        createdAt: event.createdAt,
        processedAt: event.processedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
