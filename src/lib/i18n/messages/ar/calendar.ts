import type { Message } from "../../format";
import type { calendar as en } from "../en/calendar";

export const calendar: { [K in keyof typeof en]: Message } = {
  metaTitle: "التقويم",
  eyebrow: "التقويم",
  previousMonth: "الشهر السابق",
  today: "اليوم",
  nextMonth: "الشهر التالي",
  mon: "الاثنين",
  tue: "الثلاثاء",
  wed: "الأربعاء",
  thu: "الخميس",
  fri: "الجمعة",
  sat: "السبت",
  sun: "الأحد",
  more: "+{count} أخرى",
  nothingScheduled: "لا شيء في الجدول.",
  timeRange: "من {start} إلى {end}",
  openClassroom: "افتح الصف ←",
  open: "افتح ←",
  kindClass: "حصة مباشرة",
  kindLab: "مختبر",
  kindOfficeHours: "الساعات المكتبية",
  kindWorkshop: "ورشة عمل",
  kindDeadline: "موعد التسليم",
  kindEvent: "فعالية",
};
