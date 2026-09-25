import type { Message } from "../../format";
import type { classes as en } from "../en/classes";

export const classes: { [K in keyof typeof en]: Message } = {
  liveNow: "مباشرة الآن",
  next: "التالية",
  recording: "تسجيل الحصة",
  ended: "انتهت",
  noMore: "لا توجد حصص مباشرة أخرى في هذه الدفعة. التسجيلات أدناه.",
  past: "الحصص السابقة وتسجيلاتها",
  liveClassroom: "الفصل المباشر",
  live: "مباشرة",
  when: "الموعد",
  duration: "المدة",
  via: "عبر",
  minutes: {
    one: "دقيقة واحدة",
    two: "دقيقتان",
    few: "{count} دقائق",
    many: "{count} دقيقة",
    other: "{count} دقيقة",
  },
  watchRecording: "شاهد التسجيل",
  processing: "جارٍ تجهيز التسجيل.",
  join: "انضم إلى الحصة",
  opensBefore: "تُفتح قبل البدء بعشر دقائق · {when}",
  instructor: "المدرّب",
  participants: "المشاركون",
  attended: { one: "حضر", two: "حضرا", other: "حضروا" },
  invited: {
    one: "طالب مدعو",
    two: "طالبان مدعوان",
    few: "طلاب مدعوون",
    many: "طالبًا مدعوًا",
    other: "طالب مدعو",
  },
  resources: "الموارد",
  noResources: "لا توجد موارد بعد.",
};
