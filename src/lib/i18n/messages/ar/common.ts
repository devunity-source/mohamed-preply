import type { Message } from "../../format";
import type { common as en } from "../en/common";

export const common: { [K in keyof typeof en]: Message } = {
  languageLabel: "اللغة",
  switchTo: "English",
  today: "اليوم",
  tomorrow: "غدًا",
  yesterday: "أمس",
  justNow: "الآن",
  minutesAgo: { one: "قبل دقيقة", two: "قبل دقيقتين", few: "قبل {count} دقائق", other: "قبل {count} دقيقة" },
  hoursAgo: { one: "قبل ساعة", two: "قبل ساعتين", few: "قبل {count} ساعات", other: "قبل {count} ساعة" },
  daysAgo: { one: "قبل يوم", two: "قبل يومين", few: "قبل {count} أيام", other: "قبل {count} يومًا" },
  goodMorning: "صباح الخير",
  goodAfternoon: "مساء الخير",
  goodEvening: "مساء الخير",
  notAvailable: "غير متاح",
};
