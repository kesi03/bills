// src/services/HolidayService.ts
import axios from 'axios';

export class HolidayService {
  private static apiUrl = 'https://date.nager.at/api/v3/PublicHolidays';

  static async getPublicHolidays(year: string, country: string): Promise<Date[]> {
    try {
      const response = await axios.get(`${this.apiUrl}/${year}/${country}`);
      const holidays = response.data;

      return holidays.filter((holiday:{counties:string[]})=>{
        return (holiday.counties?.includes('GB-ENG') || holiday.counties===null)
      }).map((holiday: { date: string }) => new Date(holiday.date));
    } catch (error) {
      console.error('Failed to fetch public holidays:', error);
      return [];
    }
  }

  static async getPublicHolidaysData(year: string, country: string): Promise<Date[]> {
    try {
      const response = await axios.get(`${this.apiUrl}/${year}/${country}`);
      const holidays = response.data;

      return holidays;
    } catch (error) {
      console.error('Failed to fetch public holidays:', error);
      return [];
    }
  }

  public static async getCompletedDate(appointmentDateTime: Date): Promise<Date> {
      const year = appointmentDateTime.getFullYear().toString();
      const country = 'GB'; // UK
  
      const holidays = await HolidayService.getPublicHolidays(year, country);
      const holidayStrings = holidays.map(d => d.toDateString());
  
      let workingDaysCount = 0;
      let currentDate = new Date(appointmentDateTime);
  
      while (workingDaysCount < 3) {
        currentDate.setDate(currentDate.getDate() + 1);
  
        const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
        const isHoliday = holidayStrings.includes(currentDate.toDateString());
  
        if (!isWeekend && !isHoliday) {
          workingDaysCount++;
        }
      }
  
      return currentDate;
    }

    public static getCompletedDateWithHolidays(appointmentDateTime: Date,holidayStrings:string[]): Date {
      let workingDaysCount = 0;
      let currentDate = new Date(appointmentDateTime);
  
      while (workingDaysCount < 3) {
        currentDate.setDate(currentDate.getDate() + 1);
  
        const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
        const isHoliday = holidayStrings.includes(currentDate.toDateString());
  
        if (!isWeekend && !isHoliday) {
          workingDaysCount++;
        }
      }
  
      return currentDate;
    }
}