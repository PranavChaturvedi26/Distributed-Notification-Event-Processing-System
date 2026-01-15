import { NotificationChannel } from '../models/Notification';
import { EventType } from '../models/Event';

export interface UserPreferences {
  userId: string;
  email: boolean;
  inApp: boolean;
  emailAddress?: string;
}

// Mock user preferences - In production, this would fetch from a database
const mockUserPreferences: Record<string, UserPreferences> = {
  default: {
    userId: 'default',
    email: true,
    inApp: true,
  },
};

export class PreferenceService {
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    // Simulate database lookup delay
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Return user preferences or default
    return (
      mockUserPreferences[userId] || {
        userId,
        email: true,
        inApp: true,
      }
    );
  }

  async getNotificationChannels(
    userId: string,
    eventType: EventType
  ): Promise<NotificationChannel[]> {
    const preferences = await this.getUserPreferences(userId);
    const channels: NotificationChannel[] = [];

    // Determine channels based on user preferences
    if (preferences.email) {
      channels.push(NotificationChannel.EMAIL);
    }

    if (preferences.inApp) {
      channels.push(NotificationChannel.IN_APP);
    }

    return channels;
  }

  getEmailTemplate(eventType: EventType, data: Record<string, any>): { subject: string; content: string } {
    const templates: Record<EventType, { subject: string; content: string }> = {
      [EventType.USER_SIGNUP]: {
        subject: 'Welcome to Our Platform!',
        content: `Hello! Welcome to our platform. Your account has been created successfully.`,
      },
      [EventType.ORDER_PLACED]: {
        subject: 'Order Confirmation',
        content: `Your order has been placed successfully. Order details: ${JSON.stringify(data)}`,
      },
      [EventType.PAYMENT_SUCCESS]: {
        subject: 'Payment Successful',
        content: `Your payment has been processed successfully. Amount: ${data.amount || 'N/A'}`,
      },
      [EventType.PASSWORD_RESET]: {
        subject: 'Password Reset Request',
        content: `A password reset has been requested for your account. If this wasn't you, please ignore this email.`,
      },
    };

    return templates[eventType] || { subject: 'Notification', content: 'You have a new notification.' };
  }
}

export const preferenceService = new PreferenceService();
