import { z } from 'zod';
import { ROLE_VALUES } from '../constants/roles.js';

export const createUserSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(200),
  role: z.enum(ROLE_VALUES),
  department: z.string().trim().max(100).optional(),
  facultyId: z.string().trim().max(100).optional(),
  studentGroupIds: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
}).strict().superRefine((user, context) => {
  if (user.role === 'DEPARTMENT_COORDINATOR' && !user.department?.trim()) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['department'], message: 'Department is required for a department coordinator.' });
  }
  if (user.role === 'FACULTY' && !user.facultyId?.trim()) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['facultyId'], message: 'Faculty ID is required for a faculty account.' });
  }
  if (user.role === 'STUDENT' && !user.studentGroupIds?.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['studentGroupIds'], message: 'At least one student group is required for a student account.' });
  }
});

export const listUsersQuerySchema = z.object({
  role: z.enum(ROLE_VALUES).optional(),
  department: z.string().trim().min(1).max(100).optional(),
  isActive: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
}).strict();

export const userIdParamsSchema = z.object({ userId: z.string().regex(/^[a-f\d]{24}$/i) }).strict();
export const userStatusSchema = z.object({ isActive: z.boolean() }).strict();
export const userProfileSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  department: z.string().trim().min(1).max(100).optional(),
  facultyId: z.string().trim().min(1).max(100).optional(),
  studentGroupIds: z.array(z.string().trim().min(1).max(100)).min(1).max(20).optional(),
}).strict().refine((profile) => Object.keys(profile).length > 0, { message: 'At least one profile field is required.' });
