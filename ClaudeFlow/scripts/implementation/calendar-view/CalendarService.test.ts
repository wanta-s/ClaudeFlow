import { CalendarService } from './CalendarService';
import { MemoryCalendarStore } from './MemoryCalendarStore';
import { Resource, Reservation } from './types';

describe('CalendarService', () => {
  let service: CalendarService;
  let store: MemoryCalendarStore;

  beforeEach(() => {
    store = new MemoryCalendarStore();
    service = new CalendarService(store);
  });

  describe('generateCalendarDays', () => {
    it('should generate calendar days for a month including surrounding days', () => {
      const days = service.generateCalendarDays(2024, 1);

      expect(days.length).toBeGreaterThanOrEqual(35);
      
      const januaryDays = days.filter(day => day.isCurrentMonth);
      expect(januaryDays).toHaveLength(31);
      
      const firstDay = days[0];
      expect(firstDay.dayOfWeek).toBe(0);
      
      const lastDay = days[days.length - 1];
      expect(lastDay.dayOfWeek).toBe(6);
    });

    it('should mark current month days correctly', () => {
      const days = service.generateCalendarDays(2024, 1);
      
      const januaryDays = days.filter(day => day.isCurrentMonth);
      januaryDays.forEach(day => {
        expect(day.date.getMonth()).toBe(0);
        expect(day.date.getFullYear()).toBe(2024);
      });
    });
  });

  describe('getMonthView', () => {
    it('should return month view with empty reservations', async () => {
      const resource: Resource = {
        id: 'room-1',
        name: 'Conference Room A',
        type: 'room',
        capacity: 10
      };
      store.addResource(resource);

      const view = await service.getMonthView(2024, 1);

      expect(view.year).toBe(2024);
      expect(view.month).toBe(1);
      expect(view.resources).toHaveLength(1);
      expect(view.resources[0]).toEqual(resource);
      expect(view.days.length).toBeGreaterThanOrEqual(35);
      
      view.days.forEach(day => {
        expect(day.reservations).toEqual([]);
      });
    });

    it('should include reservations in the month view', async () => {
      const resource: Resource = {
        id: 'room-1',
        name: 'Conference Room A',
        type: 'room',
        capacity: 10
      };
      store.addResource(resource);

      const reservation: Reservation = {
        id: 'res-1',
        resourceId: 'room-1',
        date: new Date('2024-01-15'),
        timeSlot: '10:00-11:00',
        status: 'confirmed',
        items: ['item1', 'item2']
      };
      store.addReservation('2024-01-15', reservation);

      const view = await service.getMonthView(2024, 1);

      const jan15 = view.days.find(day => 
        day.date.getDate() === 15 && day.isCurrentMonth
      );

      expect(jan15).toBeDefined();
      expect(jan15!.reservations).toHaveLength(1);
      expect(jan15!.reservations[0]).toEqual({
        id: 'res-1',
        resourceId: 'room-1',
        resourceName: 'Conference Room A',
        timeSlot: '10:00-11:00',
        status: 'confirmed',
        itemCount: 2
      });
    });
  });

  describe('getDayReservations', () => {
    it('should return empty array for day with no reservations', async () => {
      const date = new Date('2024-01-15');
      const reservations = await service.getDayReservations(date);

      expect(reservations).toEqual([]);
    });

    it('should return reservations for a specific day', async () => {
      const resource: Resource = {
        id: 'room-1',
        name: 'Conference Room A',
        type: 'room',
        capacity: 10
      };
      store.addResource(resource);

      const reservation1: Reservation = {
        id: 'res-1',
        resourceId: 'room-1',
        date: new Date('2024-01-15'),
        timeSlot: '10:00-11:00',
        status: 'confirmed',
        items: ['item1']
      };
      const reservation2: Reservation = {
        id: 'res-2',
        resourceId: 'room-1',
        date: new Date('2024-01-15'),
        timeSlot: '14:00-15:00',
        status: 'pending',
        items: []
      };

      store.addReservation('2024-01-15', reservation1);
      store.addReservation('2024-01-15', reservation2);

      const reservations = await service.getDayReservations(new Date('2024-01-15'));

      expect(reservations).toHaveLength(2);
      expect(reservations[0]).toEqual({
        id: 'res-1',
        resourceId: 'room-1',
        resourceName: 'Conference Room A',
        timeSlot: '10:00-11:00',
        status: 'confirmed',
        itemCount: 1
      });
      expect(reservations[1]).toEqual({
        id: 'res-2',
        resourceId: 'room-1',
        resourceName: 'Conference Room A',
        timeSlot: '14:00-15:00',
        status: 'pending',
        itemCount: 0
      });
    });
  });

  describe('getResourceUtilization', () => {
    it('should return basic utilization data', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      const utilization = await service.getResourceUtilization('room-1', startDate, endDate);

      expect(utilization).toEqual({
        resourceId: 'room-1',
        startDate,
        endDate,
        utilization: 0
      });
    });
  });
});