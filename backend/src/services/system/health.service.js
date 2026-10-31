import mongoose from 'mongoose';
import { Dataset } from '../../models/Dataset.js';
import { ScheduleVersion } from '../../models/ScheduleVersion.js';

export async function getReadiness() {
  const databaseConnected = mongoose.connection.readyState === 1;
  if (!databaseConnected) {
    return {
      ready: false,
      status: 'not_ready',
      checks: { database: 'disconnected', activeDataset: 'unknown', activeSchedule: 'unknown' },
    };
  }

  const dataset = await Dataset.findOne({ status: 'active' }).select('_id').lean();
  const schedule = dataset
    ? await ScheduleVersion.exists({ dataset: dataset._id, status: 'active' })
    : null;
  return {
    ready: true,
    status: 'ready',
    checks: {
      database: 'connected',
      activeDataset: Boolean(dataset),
      activeSchedule: Boolean(schedule),
    },
  };
}
