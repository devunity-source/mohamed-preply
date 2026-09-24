import type { Message } from "../../format";
import type { grading as en } from "../en/grading";

export const grading: { [K in keyof typeof en]: Message } = {
  // Assignment list
  noAssignments: "لا توجد واجبات في هذه الدفعة.",
  due: "موعد التسليم {date}",
  submittedOf: "سلّم {count} من {total}",
  toGrade: {
    one: "تسليم واحد للتقييم",
    two: "تسليمان للتقييم",
    few: "{count} تسليمات للتقييم",
    many: "{count} تسليمًا للتقييم",
    other: "{count} تسليم للتقييم",
  },
  allGraded: "قُيّم الجميع",
  open: "مفتوح",
  noneIn: "لا تسليمات",

  // One assignment
  allAssignments: "كل الواجبات",
  dueAllGraded: "موعد التسليم {date} · قُيّم الجميع",
  dueToGrade: {
    one: "موعد التسليم {date} · تسليم واحد بانتظار التقييم",
    two: "موعد التسليم {date} · تسليمان بانتظار التقييم",
    few: "موعد التسليم {date} · {count} تسليمات بانتظار التقييم",
    many: "موعد التسليم {date} · {count} تسليمًا بانتظار التقييم",
    other: "موعد التسليم {date} · {count} تسليم بانتظار التقييم",
  },
  submissionsTitle: "التسليمات · {count}",
  needsGrading: "بحاجة إلى تقييم",
  nothingSubmitted: "لم يُسلَّم شيء بعد.",
  notSubmittedTitle: "لم يسلّموا · {count}",
  sendReminder: "إرسال تذكير",
  savedGrade: "حُفظت درجة {name} ({grade}/100). وصله إشعار بذلك.",
  submittedMeta: "سلّم {ago} · {position} من {total}",
  gradeOutOf: "{grade}/100",
  stateGraded: "مُقيَّم",
  stateSubmitted: "مُسلَّم",
  stateLate: "متأخر",
  stateNotSubmitted: "لم يُسلَّم",
  openRepo: "فتح المستودع",
  note: "«{note}»",
  lastGraded: "آخر تقييم من {name} {ago}",
  lastGradedNoRubric: "آخر تقييم من {name} {ago} (قبل اعتماد معايير التقييم؛ أعد التقييم لتسجيل الدرجات)",
  keysHint: "<k>j</k> / <k>k</k> التالي والسابق · <k>⌘</k>/<k>Ctrl</k> + <k>Enter</k> حفظ",
  noSubmissions: "لا تسليمات للتقييم بعد.",
};
