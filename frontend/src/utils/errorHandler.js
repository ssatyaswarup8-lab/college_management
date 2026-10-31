import { getApiErrorMessage } from '../api/client.js'

const ERROR_MESSAGES = {
  VALIDATION_ERROR: 'Some information is missing or invalid. Review the form and try again.',
  UNAUTHORIZED: 'Your session has expired. Please sign in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested item could not be found.',
  ROOM_CONFLICT: 'That room is already occupied during the selected time.',
  FACULTY_CONFLICT: 'That faculty member is already assigned during the selected time.',
  STUDENT_GROUP_CONFLICT: 'This student group already has a session during the selected time.',
  FIXED_SLOT_VIOLATION: 'This session must remain in its fixed time slot.',
  ROOM_CAPACITY_INSUFFICIENT: 'The selected room does not have enough capacity.',
  ROOM_TYPE_MISMATCH: 'The selected room does not support this session type.',
  ROOM_UNAVAILABLE: 'The selected room is unavailable during that time.',
  FACULTY_UNAVAILABLE: 'The faculty member is unavailable during that time.',
  LUNCH_VIOLATION: 'A session cannot run across the lunch break.',
  LAB_SLOT_INVALID: 'Labs can only start in the allowed lab periods.',
  DAILY_LIMIT_EXCEEDED: 'This change would exceed the faculty member’s daily teaching limit.',
  BOOKING_CONFLICT: 'This booking conflicts with another event or scheduled session.',
  PRIORITY_CONFLICT: 'A higher-priority request takes precedence for this time and venue.',
  NO_VALID_SOLUTION: 'No valid schedule repair was found for these conditions.',
  DATASET_INVALID: 'The dataset could not be validated. Review the reported issues.',
  DATASET_NOT_FOUND: 'The selected dataset could not be found.',
  SCHEDULE_NOT_FOUND: 'The requested schedule could not be found.',
}

export function getFriendlyError(error, fallback) {
  const code = error?.response?.data?.error?.code ?? error?.error?.code
  const message = error?.response?.data?.message ?? error?.message
  const details = error?.response?.data?.error?.details ?? error?.error?.details
  const violations = details?.violations ?? details?.decisionBlockers ?? []
  const violationMessages = Array.isArray(violations)
    ? violations.map((violation) => violation?.message ?? violation?.code).filter(Boolean)
    : []
  const violationSummary = violationMessages.length
    ? ` ${violationMessages.slice(0, 5).join(' ')}${violationMessages.length > 5 ? ` And ${violationMessages.length - 5} more conflict(s).` : ''}`
    : ''
  const higherPriority = Array.isArray(details?.higherPriorityRequests) ? details.higherPriorityRequests : []
  const prioritySummary = higherPriority.length
    ? ` Higher-priority overlapping request(s): ${higherPriority.map((request) => request.title ?? request.requestId ?? request.id ?? 'another request').join(', ')}.`
    : ''
  const baseMessage =
    (code && ERROR_MESSAGES[code]) ||
    (typeof message === 'string' && !message.toLowerCase().includes('axios') ? message : null) ||
    getApiErrorMessage(error, fallback ?? 'Unable to complete the request. Please try again.')

  return {
    code: code ?? null,
    message: `${baseMessage}${violationSummary}${prioritySummary}`,
    details: details ?? null,
  }
}

export { ERROR_MESSAGES }
