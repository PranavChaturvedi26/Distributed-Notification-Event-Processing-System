import IORedis from 'ioredis';
import { config } from './index';

export const redisConnection = new IORedis({
  host: config.redis.host,
  port: config.redis.port,
  maxRetriesPerRequest: null,
});

redisConnection.on('connect', () => {
  console.log('Redis connected successfully');
});

redisConnection.on('error', (err) => {
  console.error('Redis connection error:', err);
});
