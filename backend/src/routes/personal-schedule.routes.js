import { Router } from 'express';
import { ROLES } from '../constants/roles.js';
import * as facultyController from '../controllers/faculty.controller.js';
import * as studentController from '../controllers/student.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { studentAgendaQuerySchema } from '../validators/student-schedule.validator.js';

const students = Router();
students.use(authenticate, requireRoles(ROLES.STUDENT));
students.get('/me/schedule', studentController.schedule);
students.get('/me/exams', studentController.exams);
students.get('/me/events', studentController.events);
students.get('/me/next-class', studentController.nextClass);
students.get('/me/today', validate(studentAgendaQuerySchema, 'query'), studentController.todayAgenda);
students.get('/me/agenda', validate(studentAgendaQuerySchema, 'query'), studentController.todayAgenda);

const faculty = Router();
faculty.use(authenticate, requireRoles(ROLES.FACULTY));
faculty.get('/me/schedule', facultyController.schedule);
faculty.get('/me/classes', facultyController.classes);

export { students as studentScheduleRoutes, faculty as facultyScheduleRoutes };
