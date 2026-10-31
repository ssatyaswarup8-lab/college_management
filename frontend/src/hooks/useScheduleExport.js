import { useMutation } from '@tanstack/react-query'
import { scheduleApi } from '../api/schedule.api.js'
export default function useScheduleExport(){return useMutation({mutationFn:()=>scheduleApi.export()})}
