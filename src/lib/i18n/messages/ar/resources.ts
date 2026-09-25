import type { Message } from "../../format";
import type { resources as en } from "../en/resources";

export const resources: { [K in keyof typeof en]: Message } = {
  metaTitle: "الموارد",
  eyebrow: "المكتبة",
  title: "الموارد",
  slides: "الشرائح",
  recordings: "تسجيلات الحصص",
  cheatsheets: "أوراق مرجعية",
  templates: "القوالب",
  labs: "المختبرات",
  sectionCount: "{title} · {count}",
  empty: "لا شيء هنا بعد.",
};
