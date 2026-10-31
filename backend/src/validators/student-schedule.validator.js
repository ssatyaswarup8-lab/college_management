import { z } from 'zod';

export const studentAgendaQuerySchema = z.object({
  date: z.string().date().optional(),
}).strict();
