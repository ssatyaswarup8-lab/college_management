import { useQuery } from '@tanstack/react-query'
import { scheduleApi } from '../api/schedule.api.js'
export default function useScheduleStatistics(params={}){return useQuery({queryKey:['schedule','statistics',params],queryFn:()=>scheduleApi.getStatistics(params)})}
