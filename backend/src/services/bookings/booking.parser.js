import { z } from 'zod';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/apiError.js';

const parseSchema = z.object({
  requestedCategory: z.enum(['institute_event', 'guest_lecture', 'department_event', 'club_event']).nullable(),
  title: z.string().nullable(),
  attendance: z.number().int().positive().nullable(),
  durationPeriods: z.number().int().positive().nullable(),
  windows: z.array(z.object({
    day: z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']),
    fromPeriod: z.number().int().min(1).max(13),
    toPeriod: z.number().int().min(1).max(14),
  }).strict()),
  roomTypes: z.array(z.string()),
  needs: z.array(z.string()),
  requestedRoom: z.string().nullable(),
  mandatoryForGroups: z.array(z.string()),
  followUp: z.string().nullable(),
}).strict();

const outputSchema = {
  type: 'object',
  properties: {
    requestedCategory: { anyOf: [{ type: 'string', enum: ['institute_event', 'guest_lecture', 'department_event', 'club_event'] }, { type: 'null' }] },
    title: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    attendance: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
    durationPeriods: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
    windows: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          day: { type: 'string', enum: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] },
          fromPeriod: { type: 'integer' },
          toPeriod: { type: 'integer' },
        },
        required: ['day', 'fromPeriod', 'toPeriod'],
      },
    },
    roomTypes: { type: 'array', items: { type: 'string' } },
    needs: { type: 'array', items: { type: 'string' } },
    requestedRoom: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    mandatoryForGroups: { type: 'array', items: { type: 'string' } },
    followUp: { type: 'string', nullable: true },
  },
  required: ['requestedCategory', 'title', 'attendance', 'durationPeriods', 'windows', 'roomTypes', 'needs', 'requestedRoom', 'mandatoryForGroups', 'followUp'],
};

function currentCampusDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long',
  }).format(new Date());
}

export async function parseBookingText(text) {
  const apiKey = env.geminiApiKey;
  if (!apiKey) throw new ApiError(503, 'AI_NOT_CONFIGURED', 'GEMINI_API_KEY is not configured. You can still submit a booking with the manual form.');

  const prompt = `Convert this campus venue request into an editable booking draft. Do not decide whether it should be approved, available, or valid. Do not invent missing facts. Use null for an unknown title, category, attendance, duration, or requested room; use an empty array for unknown lists. If any essential field is missing or ambiguous, put one concise question in followUp.\n\nCalendar context: today is ${currentCampusDate()} in Asia/Kolkata. The teaching days are MON-FRI; Saturday is available for exams/events if explicitly requested. Periods P1-P9 are 08:00-18:00, lunch is 13:00-14:00, and event periods P10-P13 run 18:00-22:00. Convert clock times to period numbers. Use inclusive fromPeriod/toPeriod values. A toPeriod of 14 may only represent the boundary after P13. In Hindi/Hinglish booking requests, interpret "kal" as tomorrow. Preserve room/equipment/accessibility needs and mandatory student groups if stated.\n\nRequest: ${text}`;

  let interaction;
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        model: env.geminiModel,
        input: prompt,
        response_format: { type: 'text', mime_type: 'application/json', schema: outputSchema },
      }),
      signal: AbortSignal.timeout(env.geminiTimeoutMs),
    });
    if (!response.ok) throw new Error(`Gemini returned HTTP ${response.status}.`);
    interaction = await response.json();
  } catch {
    throw new ApiError(503, 'AI_PROVIDER_UNAVAILABLE', 'Gemini could not parse this request. Use the manual booking form or try again.');
  }

  try {
    const parsed = parseSchema.parse(JSON.parse(interaction.output_text));
    const missing = parsed.attendance === null || parsed.durationPeriods === null || parsed.windows.length === 0 || parsed.roomTypes.length === 0;
    if (missing && !parsed.followUp) parsed.followUp = 'Please provide the attendance, duration, time window, and venue type.';
    return { ...parsed, aiAssisted: true, requiresUserReview: true };
  } catch {
    throw new ApiError(502, 'AI_RESPONSE_INVALID', 'Gemini returned a booking draft that could not be validated. Use the manual booking form.');
  }
}
