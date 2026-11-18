import client from './client';

export const inventoryApi = {
  getAvailability: (scheduleId, params = {}) => {
    const qs = new URLSearchParams();
    if (params.fromSeq != null) qs.set('fromSeq', params.fromSeq);
    if (params.toSeq != null) qs.set('toSeq', params.toSeq);
    const qStr = qs.toString();
    return client.get(`/inventory/schedules/${scheduleId}/availability${qStr ? '?' + qStr : ''}`).then((r) => r.data);
  },

  getSeats: (scheduleId, params = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.seatType) qs.set('seatType', params.seatType);
    if (params.fromSeq) qs.set('fromSeq', params.fromSeq);  // --- SEGMENT BOOKING
    if (params.toSeq) qs.set('toSeq', params.toSeq);        // --- SEGMENT BOOKING
    const qStr = qs.toString();
    return client.get(`/inventory/schedules/${scheduleId}/seats${qStr ? '?' + qStr : ''}`).then((r) => r.data);
  },
};
