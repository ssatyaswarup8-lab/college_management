import { Router } from 'express';
import { z } from 'zod';
import { ROLES } from '../constants/roles.js';
import * as bookingController from '../controllers/booking.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { declineAlternativeSchema } from '../validators/booking-response.validator.js';
import { bookingPriorityQuerySchema } from '../validators/booking-priority.validator.js';
import { alternativeAcceptSchema, bookingDecisionSchema } from '../validators/booking-decision.validator.js';
import { bookingImpactSchema } from '../validators/booking-impact.validator.js';

const router = Router();
const submitRoles = [ROLES.ADMIN, ROLES.DEPARTMENT_COORDINATOR, ROLES.FACULTY, ROLES.CLUB_REPRESENTATIVE];
const decideRoles = [ROLES.ADMIN, ROLES.DEPARTMENT_COORDINATOR];
const day = z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']);
const paramsSchema = z.object({ id: z.string().trim().min(1).max(100) }).strict();
const createBookingSchema = z.object({
  requestedCategory: z.enum(['institute_event', 'guest_lecture', 'department_event', 'club_event']).optional(),
  title: z.string().trim().min(1).max(200),
  attendance: z.number().int().positive().max(10_000),
  durationPeriods: z.number().int().positive().max(13),
  windows: z.array(z.object({ day, fromPeriod: z.number().int().min(1).max(13), toPeriod: z.number().int().min(1).max(14) }).strict()).min(1).max(20),
  roomTypes: z.array(z.string().trim().min(1)).min(1).max(20),
  needs: z.array(z.string().trim().min(1)).max(30).default([]),
  requestedRoom: z.string().trim().min(1).max(100).optional(),
  mandatoryForGroups: z.array(z.string().trim().min(1)).max(50).default([]),
  rawText: z.string().max(2000).optional(),
}).strict();
const parseBookingSchema = z.object({ text: z.string().trim().min(1).max(2000) }).strict();
const bookingRejectionSchema = z.object({ reason: z.string().trim().min(1).max(1000) }).strict();
const listQuerySchema = z.object({ status: z.enum(['pending', 'approved', 'rejected', 'alternative_offered', 'cancelled']).optional() }).strict();

router.use(authenticate);
router.get('/', requireRoles(...submitRoles), validate(listQuerySchema, 'query'), bookingController.list);
router.get('/pending', requireRoles(...decideRoles), bookingController.pending);
router.get('/priority-queue', requireRoles(...decideRoles), validate(bookingPriorityQuerySchema, 'query'), bookingController.priorityQueue);
router.post('/parse', requireRoles(...submitRoles), validate(parseBookingSchema), bookingController.parse);
router.post('/', requireRoles(...submitRoles), validate(createBookingSchema), bookingController.create);
router.post('/:id/impact', requireRoles(...decideRoles), validate(paramsSchema, 'params'), validate(bookingImpactSchema), bookingController.impact);
router.post('/:id/approve', requireRoles(...decideRoles), validate(paramsSchema, 'params'), validate(bookingDecisionSchema), bookingController.approve);
router.post('/:id/reject', requireRoles(...decideRoles), validate(paramsSchema, 'params'), validate(bookingRejectionSchema), bookingController.reject);
router.post('/:id/alternative', requireRoles(...decideRoles), validate(paramsSchema, 'params'), validate(bookingDecisionSchema), bookingController.alternative);
router.post('/:id/alternative/accept', requireRoles(...submitRoles), validate(paramsSchema, 'params'), validate(alternativeAcceptSchema), bookingController.acceptAlternative);
router.post('/:id/alternative/decline', requireRoles(...submitRoles), validate(paramsSchema, 'params'), validate(declineAlternativeSchema), bookingController.declineAlternative);
router.post('/:id/cancel', requireRoles(...submitRoles), validate(paramsSchema, 'params'), bookingController.cancel);

export default router;
