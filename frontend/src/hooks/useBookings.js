import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { bookingApi } from '../api/booking.api.js'

export const bookingKeys = {
  all: ['bookings'],
  list: (params) => ['bookings', 'list', params],
  pending: (params) => ['bookings', 'pending', params],
}

export function useBookings(params = {}, options = {}) {
  return useQuery({
    queryKey: bookingKeys.list(params),
    queryFn: () => bookingApi.getAll(params),
    enabled: options.enabled ?? true,
  })
}

export function usePendingBookings(params = {}, options = {}) {
  return useQuery({
    queryKey: bookingKeys.pending(params),
    queryFn: () => bookingApi.getPending(params),
    enabled: options.enabled ?? true,
  })
}

export function useBookingActions() {
  const queryClient = useQueryClient()
  const refreshBookings = () => queryClient.invalidateQueries({ queryKey: bookingKeys.all })

  return {
    parse: useMutation({ mutationFn: bookingApi.parseRequest }),
    create: useMutation({ mutationFn: bookingApi.create, onSuccess: refreshBookings }),
    approve: useMutation({
      mutationFn: ({ bookingId, ...payload }) => bookingApi.approve(bookingId, payload),
      onSuccess: refreshBookings,
    }),
    reject: useMutation({
      mutationFn: ({ bookingId, ...payload }) => bookingApi.reject(bookingId, payload),
      onSuccess: refreshBookings,
    }),
    offerAlternative: useMutation({
      mutationFn: ({ bookingId, ...payload }) => bookingApi.offerAlternative(bookingId, payload),
      onSuccess: refreshBookings,
    }),
    cancel: useMutation({
      mutationFn: ({ bookingId, ...payload }) => bookingApi.cancel(bookingId, payload),
      onSuccess: refreshBookings,
    }),
  }
}
