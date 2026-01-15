import { connectDatabase } from '../config/database';
import './orchestrator.worker';
import './email.worker';

async function startWorkers(): Promise<void> {
  try {
    // Connect to MongoDB
    await connectDatabase();

    console.log('Workers started successfully');
    console.log('- Orchestrator Worker: Listening on event_queue');
    console.log('- Email Worker: Listening on email_queue');
    console.log('');
    console.log('Configuration:');
    console.log('- Concurrency: 5');
    console.log('- Max Retries: 3');
    console.log('- Backoff: Exponential (1000ms base)');
  } catch (error) {
    console.error('Failed to start workers:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down workers gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down workers gracefully...');
  process.exit(0);
});

startWorkers();
