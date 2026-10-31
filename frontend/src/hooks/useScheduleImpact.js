import { useMutation } from '@tanstack/react-query'
import { conflictApi } from '../api/conflict.api.js'
import { scheduleApi } from '../api/schedule.api.js'
export default function useScheduleImpact(){return useMutation({mutationFn:(payload)=>scheduleApi.analyzeMove({sessionId:payload.sessionId,...payload.proposed})})}
