# Distributed Notification Event Processing System

A production-grade event-driven notification system built with Node.js, Express, BullMQ, and MongoDB. Demonstrates async processing, queue-based architecture, and reliability patterns commonly discussed in system design interviews.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│   Client    │────▶│  REST API   │────▶│    MongoDB       │
│             │     │  /events    │     │  (Event Store)   │
└─────────────┘     └──────┬──────┘     └──────────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │    Redis    │
                   │ (BullMQ)    │
                   └──────┬──────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
     ┌─────────────────┐     ┌─────────────────┐
     │  Orchestrator   │     │  Email Worker   │
     │    Worker       │────▶│                 │
     └─────────────────┘     └────────┬────────┘
                                      │
                                      ▼
                             ┌─────────────────┐
                             │  DLQ (Failed    │
                             │  Notifications) │
                             └─────────────────┘
```

## Features

| Feature | Description |
|---------|-------------|
| **Event Ingestion API** | RESTful endpoint with Zod validation |
| **Async Processing** | Decoupled via BullMQ queues |
| **Idempotency** | Duplicate event detection using eventId |
| **Retry + Backoff** | 3 attempts with exponential backoff |
| **Dead Letter Queue** | Failed jobs persisted for analysis |
| **User Preferences** | Channel routing based on user settings |

## Project Structure

```
src/
├── api/
│   └── events.ts              # POST /events endpoint
├── config/
│   ├── index.ts               # Central configuration
│   ├── database.ts            # MongoDB connection
│   └── redis.ts               # Redis connection
├── models/
│   ├── Event.ts               # Event schema
│   ├── Notification.ts        # Notification schema
│   └── FailedNotification.ts  # DLQ schema
├── queues/
│   └── event.queue.ts         # BullMQ queue definitions
├── services/
│   └── preference.service.ts  # User preferences & templates
├── workers/
│   ├── orchestrator.worker.ts # Event routing logic
│   ├── email.worker.ts        # Email sender (mock)
│   └── index.ts               # Worker entry point
├── app.ts                     # Express app
└── server.ts                  # Server entry point
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Redis (local or cloud)

### Installation

```bash
# Clone the repository
git clone https://github.com/PranavChaturvedi26/Distributed-Notification-Event-Processing-System.git
cd Distributed-Notification-Event-Processing-System

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Update .env with your MongoDB and Redis URLs
```

### Running the Application

```bash
# Terminal 1: Start the API server
npm run dev

# Terminal 2: Start the workers
npm run worker
```

## API Reference

### POST /events

Ingest a new event for processing.

**Request:**
```json
{
  "type": "USER_SIGNUP",
  "userId": "user_123",
  "data": {
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Event received and queued for processing",
  "eventId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Supported Event Types

| Event Type | Description | Notification Content |
|------------|-------------|---------------------|
| `USER_SIGNUP` | New user registration | Welcome email |
| `ORDER_PLACED` | Order confirmation | Order details |
| `PAYMENT_SUCCESS` | Payment completed | Receipt |
| `PASSWORD_RESET` | Password reset request | Reset link |

## Queue Configuration

```typescript
{
  concurrency: 5,        // Process 5 jobs in parallel
  maxRetries: 3,         // Retry failed jobs 3 times
  backoff: {
    type: 'exponential', // Exponential backoff
    delay: 1000          // Base delay: 1 second
  }
}
```

**Retry Timeline:**
- Attempt 1: Immediate
- Attempt 2: After 1 second
- Attempt 3: After 2 seconds
- Attempt 4: After 4 seconds → DLQ

## System Design Highlights

### 1. Decoupling with Message Queues
The API immediately returns after storing the event, while workers process asynchronously. This prevents blocking and improves throughput.

### 2. Idempotency
Each event has a unique `eventId`. Duplicate submissions are detected and rejected, preventing double-processing.

### 3. Orchestrator Pattern
The orchestrator worker acts as a router, fetching user preferences and directing events to appropriate channel queues (email, in-app, etc.).

### 4. Dead Letter Queue
Jobs that fail after all retry attempts are moved to a `failed_notifications` collection with full error context for debugging.

### 5. Status Tracking
Events progress through states: `RECEIVED` → `PROCESSING` → `COMPLETED/FAILED`, enabling monitoring and debugging.

## Testing Retries

The email worker has a 20% simulated failure rate to demonstrate retry behavior:

```bash
# Send multiple events to observe retries
for i in {1..10}; do
  curl -X POST http://localhost:3000/events \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"USER_SIGNUP\",\"userId\":\"user_$i\",\"data\":{\"email\":\"user$i@test.com\"}}"
done
```

Watch the worker logs to see retry attempts and DLQ entries.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | 3000 |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/notification-system |
| `REDIS_HOST` | Redis host | localhost |
| `REDIS_PORT` | Redis port | 6379 |

## Tech Stack

- **Runtime:** Node.js with TypeScript
- **API:** Express.js
- **Validation:** Zod
- **Queue:** BullMQ (Redis-backed)
- **Database:** MongoDB with Mongoose
- **Process Manager:** ts-node-dev

## License

ISC
