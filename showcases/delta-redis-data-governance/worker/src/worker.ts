import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import Redis from 'ioredis';
import axios from 'axios';

const connection = new Redis(process.env.REDIS_URL || 'redis://redis:6379');
const seedQueueName = 'seed-jobs';
const seedQueue = new Queue(seedQueueName, { connection });
const events = new QueueEvents(seedQueueName, { connection });

const deltaApi = process.env.DELTA_API_URL || `http://delta-api:${process.env.PORT_DELTA_API || 8000}`;

new Worker(seedQueueName, async (job: Job) => {
  const { dataset, size, role } = job.data;
  await axios.post(`${deltaApi}/seed`, { dataset, size, role });
  return { ok: true };
}, { connection });

events.on('completed', ({ jobId }) => {
  console.log(`[worker] job completed ${jobId}`);
});

console.log(`[worker] ready; queue=${seedQueueName}`);

