import { useMemo } from "react";
import Holidays from "date-holidays";
import type { EventInput } from "@fullcalendar/core";

const holidayDescriptions: Record<string, string> = {
  "New Year's Day": "The first day of the year in the modern Gregorian calendar.",
  "Martin Luther King": "A day honoring the achievements of Martin Luther King Jr., a civil rights leader.",
  "Valentine's Day": "A day when people express their affection with greetings and gifts.",
  "Presidents Day": "A day to honor all past presidents of the United States.",
  "St. Patrick's Day": "A cultural and religious celebration held on the traditional death date of Saint Patrick.",
  "Easter Sunday": "A Christian holiday celebrating the resurrection of Jesus.",
  "Mother's Day": "A celebration honoring the mother of the family or individual.",
  "Memorial Day": "A day of remembering the men and women who died while serving in the United States Armed Forces.",
  "Juneteenth": "A holiday commemorating the end of slavery in the United States.",
  "Father's Day": "A celebration honoring fathers and celebrating fatherhood.",
  "Independence Day": "A federal holiday in the United States commemorating the Declaration of Independence.",
  "Labor Day": "A holiday honoring the American labor movement and the contributions of workers.",
  "Columbus Day": "An official celebrating the anniversary of Christopher Columbus's arrival in the Americas.",
  "Halloween": "A celebration observed in many countries dedicated to remembering the dead.",
  "Veterans Day": "An official United States public holiday that honors military veterans.",
  "Thanksgiving Day": "A national holiday that began as a day of giving thanks for the blessing of the harvest.",
  "Christmas Day": "An annual festival commemorating the birth of Jesus Christ.",
};

function getHolidayDescription(name: string, type: string) {
  const matchedKey = Object.keys(holidayDescriptions).find(k => name.includes(k) || k.includes(name));
  if (matchedKey) return holidayDescriptions[matchedKey];
  return type === "public" 
    ? "An official federal or state public holiday." 
    : "An observed festival, cultural event, or non-federal holiday.";
}

export function useHolidays(): EventInput[] {
  const currentYear = new Date().getFullYear();

  const holidayEvents = useMemo(() => {
    const hd = new Holidays("US");
    const allHolidays = [];

    // Current year + next 5 years
    for (let year = currentYear; year <= currentYear + 5; year++) {
      allHolidays.push(...hd.getHolidays(year));
    }

    // Filter to official holidays (public) and festivals (observance)
    const filtered = allHolidays.filter(
      (h) => h.type === "public" || h.type === "observance"
    );

    return filtered.map((h, index) => {
      // date-holidays returns h.date like "2026-01-01 00:00:00"
      const dateString = h.date.split(" ")[0];

      return {
        id: `holiday-${dateString}-${index}`,
        title: h.name,
        start: dateString,
        allDay: true,
        display: "block",
        editable: false,
        backgroundColor: h.type === "public" ? "#f43f5e" : "#f59e0b", // rose-500 for public, amber-500 for observance
        borderColor: h.type === "public" ? "#e11d48" : "#d97706",
        textColor: "#ffffff",
        extendedProps: {
          isHoliday: true,
          type: h.type,
          description: getHolidayDescription(h.name, h.type)
        },
      } as EventInput;
    });
  }, [currentYear]);

  return holidayEvents;
}
