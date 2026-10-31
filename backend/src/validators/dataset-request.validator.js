import { z } from 'zod';

export const datasetVersionParamsSchema = z.object({
  datasetVersionId: z.string().regex(/^[a-f\d]{24}$/i, 'Dataset version id must be a MongoDB ObjectId.'),
}).strict();
