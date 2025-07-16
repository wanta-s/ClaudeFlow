import { CalendarView, CalendarDay, ReservationSummary } from './types';
import { MemoryCalendarStore } from './MemoryCalendarStore';

export class CalendarService {
  constructor(private store: MemoryCalendarStore) {}

  async getMonthView(year: number, month: number): Promise<CalendarView> {
    const days = this.generateCalendarDays(year, month);
    const resources = this.store.getAllResources();
    
    const monthReservations = this.store.getMonthReservations(year, month);
    
    for (const day of days) {
      const dateKey = this.formatDateKey(day.date);
      const dayReservations = monthReservations.get(dateKey) || [];
      
      day.reservations = dayReservations.map(res => {
        const resource = this.store.getResource(res.resourceId);
        return {
          id: res.id,
          resourceId: res.resourceId,
          resourceName: resource?.name || 'Unknown',
          timeSlot: res.timeSlot,
          status: res.status,
          itemCount: res.items.length
        };
      });
    }
    
    return { year, month, days, resources };
  }

  async getDayReservations(date: Date): Promise<ReservationSummary[]> {
    const dateKey = this.formatDateKey(date);
    const monthReservations = this.store.getMonthReservations(
      date.getFullYear(),
      date.getMonth() + 1
    );
    
    const dayReservations = monthReservations.get(dateKey) || [];
    
    return dayReservations.map(res => {
      const resource = this.store.getResource(res.resourceId);
      return {
        id: res.id,
        resourceId: res.resourceId,
        resourceName: resource?.name || 'Unknown',
        timeSlot: res.timeSlot,
        status: res.status,
        itemCount: res.items.length
      };
    });
  }

  generateCalendarDays(year: number, month: number): CalendarDay[] {
    const days: CalendarDay[] = [];
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    
    const startCalendar = new Date(firstDay);
    startCalendar.setDate(firstDay.getDate() - firstDay.getDay());
    
    const endCalendar = new Date(lastDay);
    endCalendar.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
    
    const current = new Date(startCalendar);
    
    while (current <= endCalendar) {
      days.push({
        date: new Date(current),
        dayOfWeek: current.getDay(),
        isCurrentMonth: current.getMonth() === month - 1,
        reservations: []
      });
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }

  async getResourceUtilization(
    resourceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    return {
      resourceId,
      startDate,
      endDate,
      utilization: 0
    };
  }

  private formatDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}