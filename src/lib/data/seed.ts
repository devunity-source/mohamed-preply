import type {
  Assignment,
  Attendance,
  CampusEvent,
  ClassSession,
  Cohort,
  CohortMember,
  Comment,
  Lab,
  LabAttempt,
  Lesson,
  LessonProgress,
  Module,
  Notification,
  Post,
  Profile,
  Programme,
  Reaction,
  Resource,
  Space,
  Submission,
} from "@/lib/types";
import { addDays, formatMonthYear, startOfWeek } from "@/lib/time";

export interface Store {
  profiles: Profile[];
  programmes: Programme[];
  modules: Module[];
  lessons: Lesson[];
  cohorts: Cohort[];
  cohortMembers: CohortMember[];
  classes: ClassSession[];
  attendance: Attendance[];
  labs: Lab[];
  labAttempts: LabAttempt[];
  assignments: Assignment[];
  submissions: Submission[];
  resources: Resource[];
  events: CampusEvent[];
  spaces: Space[];
  posts: Post[];
  comments: Comment[];
  reactions: Reaction[];
  notifications: Notification[];
  lessonProgress: LessonProgress[];
}

export const DEMO_USER_ID = "u_ahmed";
const INSTRUCTOR = "u_rakan";

// ---------------------------------------------------------------------------
// People

const people: [string, string, string][] = [
  ["u_ahmed", "Ahmed Hassan", "Sysadmin moving into platform engineering"],
  ["u_maria", "Maria Lopez", "Backend developer, Madrid"],
  ["u_john", "John Carter", "Support engineer learning cloud"],
  ["u_sarah", "Sarah Kim", "Data analyst turned DevOps"],
  ["u_omar", "Omar Farouk", "Network engineer, Cairo"],
  ["u_lena", "Lena Fischer", "Junior SRE, Berlin"],
  ["u_priya", "Priya Nair", "QA automation engineer"],
  ["u_tom", "Tom Becker", "IT generalist, Hamburg"],
  ["u_nadia", "Nadia Rahman", "Frontend dev curious about infra"],
  ["u_lucas", "Lucas Martin", "Cloud support associate"],
  ["u_emma", "Emma de Vries", "Career switcher from finance"],
  ["u_ali", "Ali Haddad", "Linux admin, Amman"],
];

const AVATAR_COLORS = ["#FF5A1F", "#2F6BFF", "#00A870", "#8B5CF6", "#E5484D", "#F5A524"];

const profiles: Profile[] = [
  {
    id: INSTRUCTOR,
    fullName: "Rakan Matouq",
    handle: "rakan",
    role: "instructor",
    headline: "Lead instructor, DevOps & Cloud",
    avatarColor: "#111111",
  },
  ...people.map(([id, fullName, headline], i) => ({
    id,
    fullName,
    handle: id.slice(2),
    role: "student" as const,
    headline,
    avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
  })),
];

// ---------------------------------------------------------------------------
// Programmes and curriculum

const programmes: Programme[] = [
  {
    id: "p_devops",
    slug: "devops-engineer",
    title: "DevOps Engineer",
    tagline: "Six weeks from Linux to production Kubernetes on Azure.",
    description:
      "A live cohort programme covering the full delivery path: Linux, Git, Azure, Terraform, CI/CD, Kubernetes, security and monitoring. You finish with a capstone platform you can show employers.",
    durationWeeks: 6,
    priceCents: 59000,
    currency: "EUR",
    includes: [
      "12 live classes",
      "Hands-on labs",
      "Capstone project",
      "Cohort community",
      "Weekly office hours",
      "Recordings and resources",
      "Certificate",
    ],
  },
  {
    id: "p_ai",
    slug: "ai-engineering",
    title: "AI Engineering",
    tagline: "Ship LLM features that survive production.",
    description:
      "Build, evaluate and deploy AI features: prompting, retrieval, tool use, evals, and cost control. Taught live with weekly builds.",
    durationWeeks: 6,
    priceCents: 69000,
    currency: "EUR",
    includes: ["12 live classes", "Weekly builds", "Final project", "Cohort community", "Certificate"],
  },
];

interface WeekPlan {
  title: string;
  summary: string;
  lessons: [string, Lesson["kind"], number][];
  classes: [string, string][];
  lab: [string, Lab["difficulty"], number, string[]];
  assignment: [string, string] | null;
}

const devopsWeeks: WeekPlan[] = [
  {
    title: "DevOps Foundations",
    summary: "What DevOps actually is, the Linux you need daily, and Git as a team tool.",
    lessons: [
      ["What DevOps teams do all day", "reading", 20],
      ["Linux essentials: files, processes, permissions", "video", 45],
      ["Git beyond commit and push", "exercise", 40],
    ],
    classes: [
      [
        "Kickoff: How software gets to production",
        "Programme overview, the delivery lifecycle, and how the next six weeks work.",
      ],
      ["Linux and Git in practice", "Live terminal session: shell workflows, SSH, branching and pull requests."],
    ],
    lab: [
      "Linux server setup",
      1,
      45,
      ["Provision a VM", "Create users and SSH keys", "Harden SSH config", "Install and run nginx"],
    ],
    assignment: [
      "Git branching workflow",
      "Set up a repository with a protected main branch, a feature-branch workflow and a pull request template. Submit the repository link with a short README explaining your conventions.",
    ],
  },
  {
    title: "Azure and Networking",
    summary: "Core Azure services, virtual networks, and how traffic actually flows.",
    lessons: [
      ["Azure resource model and subscriptions", "reading", 25],
      ["VNets, subnets and NSGs", "video", 50],
      ["DNS, load balancers and private endpoints", "video", 40],
    ],
    classes: [
      ["Azure fundamentals", "Subscriptions, resource groups, identity and cost basics."],
      ["Azure Networking", "Hub-spoke design, peering, NSGs and private access."],
    ],
    lab: [
      "Azure networking",
      2,
      60,
      ["Create a hub and two spoke VNets", "Configure peering", "Lock down traffic with NSGs", "Verify with a test VM"],
    ],
    assignment: [
      "Design an Azure hub-spoke network",
      "Produce an architecture diagram and a short design doc for a hub-spoke network serving two environments. Include address plan and security rules.",
    ],
  },
  {
    title: "Terraform and CI/CD",
    summary: "Infrastructure as code with Terraform, and pipelines that deploy it safely.",
    lessons: [
      ["Terraform state, providers and modules", "video", 50],
      ["Writing reusable modules", "exercise", 45],
      ["CI/CD with GitHub Actions", "video", 40],
    ],
    classes: [
      ["Terraform Infrastructure as Code", "From click-ops to code: state, plans, modules and remote backends."],
      ["CI/CD pipelines", "Build, test and deploy pipelines with approvals and environments."],
    ],
    lab: [
      "Terraform remote state",
      3,
      60,
      ["Configure an Azure storage backend", "Split config into modules", "Run plan and apply from CI"],
    ],
    assignment: [
      "Build a Terraform Azure Landing Zone",
      "Build a landing zone with Terraform: networking, identity, policies and logging. Pipeline must run plan on PR and apply on merge.",
    ],
  },
  {
    title: "Kubernetes and AKS",
    summary: "Containers, Kubernetes primitives, and running workloads on AKS.",
    lessons: [
      ["Containers and images", "video", 35],
      ["Pods, Deployments and Services", "video", 50],
      ["Kubernetes networking and Ingress", "reading", 30],
      ["Deploying to AKS", "exercise", 45],
    ],
    classes: [
      ["From containers to Kubernetes", "Images, registries, and the core Kubernetes objects."],
      ["Kubernetes Networking", "Services, Ingress, network policies and how packets move inside a cluster."],
    ],
    lab: [
      "Deploy an AKS cluster",
      3,
      60,
      ["Create Azure resources", "Configure Terraform", "Deploy AKS", "Configure networking"],
    ],
    assignment: [
      "Deploy a microservice to AKS",
      "Containerise the sample API, deploy it to your AKS cluster with Helm, and expose it through Ingress with TLS.",
    ],
  },
  {
    title: "Security and Monitoring",
    summary: "Securing the platform and knowing when it breaks.",
    lessons: [
      ["Identity, secrets and least privilege", "reading", 30],
      ["Prometheus and Grafana", "video", 45],
      ["Alerts that people act on", "reading", 20],
    ],
    classes: [
      ["Cloud security", "Managed identities, Key Vault, policy and supply-chain basics."],
      ["Monitoring and production readiness", "Metrics, logs, SLOs and alerting."],
    ],
    lab: [
      "Observability stack",
      4,
      75,
      ["Install Prometheus", "Build a Grafana dashboard", "Create an alert rule", "Trigger and resolve it"],
    ],
    assignment: [
      "Harden and monitor your cluster",
      "Apply network policies, move secrets to Key Vault and ship a dashboard with two meaningful alerts.",
    ],
  },
  {
    title: "Capstone and Career",
    summary: "Build a production-ready platform in a team, present it, and prepare for interviews.",
    lessons: [
      ["Capstone brief", "reading", 15],
      ["Presenting technical work", "video", 25],
      ["DevOps interviews: what gets asked", "reading", 30],
    ],
    classes: [
      ["Capstone clinic", "Architecture reviews and unblocking sessions for each team."],
      ["Capstone presentations", "Each team demos their platform to the cohort."],
    ],
    lab: [
      "Capstone environment",
      4,
      90,
      ["Provision the team environment", "Wire CI/CD end to end", "Pass the readiness checklist"],
    ],
    assignment: null,
  },
];

const aiWeeks = [
  ["LLM fundamentals", "Tokens, context windows, prompting and model choice."],
  ["Retrieval", "Embeddings, chunking and RAG that returns the right thing."],
  ["Tools and agents", "Tool use, agent loops and guardrails."],
  ["Evals", "Measuring quality before and after you ship."],
  ["Production", "Latency, cost, caching and observability."],
  ["Final project", "Ship an AI feature end to end."],
];

// ---------------------------------------------------------------------------

export function createSeed(now: Date = new Date()): Store {
  const modules: Module[] = [];
  const lessons: Lesson[] = [];
  const classes: ClassSession[] = [];
  const labs: Lab[] = [];
  const assignments: Assignment[] = [];
  const resources: Resource[] = [];
  const events: CampusEvent[] = [];
  const attendance: Attendance[] = [];

  // The active cohort started on the Monday three weeks ago: today is in week 4.
  const cohortStart = addDays(startOfWeek(now), -21, "00:00");
  const cohortEnd = addDays(cohortStart, 6 * 7 - 1);
  const nextStart = addDays(cohortStart, 8 * 7, "00:00");

  const cohorts: Cohort[] = [
    {
      id: "c_devops_01",
      programmeId: "p_devops",
      code: "#01",
      name: `DevOps Engineer · ${formatMonthYear(cohortStart)}`,
      startsOn: cohortStart,
      endsOn: cohortEnd,
      status: "active",
    },
    {
      id: "c_ai_02",
      programmeId: "p_ai",
      code: "#02",
      name: `AI Engineering · ${formatMonthYear(nextStart)}`,
      startsOn: nextStart,
      endsOn: addDays(nextStart, 6 * 7 - 1),
      status: "upcoming",
    },
  ];
  const cohortId = "c_devops_01";

  const students = profiles.filter((p) => p.role === "student");
  const cohortMembers: CohortMember[] = [
    { cohortId, userId: INSTRUCTOR, role: "instructor" },
    ...students.map((s) => ({ cohortId, userId: s.id, role: "student" as const })),
    { cohortId: "c_ai_02", userId: INSTRUCTOR, role: "instructor" },
  ];

  devopsWeeks.forEach((week, w) => {
    const moduleId = `m_devops_${w + 1}`;
    const weekStart = addDays(cohortStart, w * 7, "00:00");
    modules.push({
      id: moduleId,
      programmeId: "p_devops",
      week: w + 1,
      position: 1,
      title: week.title,
      summary: week.summary,
    });

    week.lessons.forEach(([title, kind, durationMin], i) => {
      lessons.push({
        id: `${moduleId}_l${i + 1}`,
        moduleId,
        position: i + 1,
        title,
        kind,
        durationMin,
        body: `${title}. Work through this ${kind === "exercise" ? "exercise" : kind === "video" ? "video lesson" : "reading"} before the next live class. Notes, commands and links for each step live in the module resources.`,
      });
    });

    // Classes: Monday and Thursday, 19:00.
    week.classes.forEach(([title, description], i) => {
      const startsAt = addDays(weekStart, i === 0 ? 0 : 3, "19:00");
      const classId = `cl_${w + 1}_${i + 1}`;
      const past = startsAt < now;
      classes.push({
        id: classId,
        cohortId,
        moduleId,
        title,
        description,
        startsAt,
        durationMin: 90,
        instructorId: INSTRUCTOR,
        provider: "zoom",
        meetingUrl: "https://zoom.us/j/0000000000",
        recordingUrl: past ? `https://example.com/recordings/${classId}` : null,
      });
      resources.push({
        id: `r_slides_${classId}`,
        cohortId,
        moduleId,
        kind: "slides",
        title: `${title} (slides)`,
        url: `https://example.com/slides/${classId}.pdf`,
      });
      if (past) {
        resources.push({
          id: `r_rec_${classId}`,
          cohortId,
          moduleId,
          kind: "recording",
          title: `${title} (recording)`,
          url: `https://example.com/recordings/${classId}`,
        });
        students.forEach((s, si) => {
          attendance.push({
            classId,
            userId: s.id,
            status: (si + w + i) % 9 === 0 ? "absent" : (si + i) % 7 === 0 ? "late" : "present",
          });
        });
      }
    });

    // Lab: introduced Tuesday, due Sunday 23:59.
    const [labTitle, difficulty, estMinutes, objectives] = week.lab;
    labs.push({
      id: `lab_${w + 1}`,
      cohortId,
      moduleId,
      number: w + 1,
      title: labTitle,
      difficulty,
      estMinutes,
      objectives,
      dueAt: addDays(weekStart, 6, "23:59"),
    });
    resources.push({
      id: `r_lab_${w + 1}`,
      cohortId,
      moduleId,
      kind: "lab",
      title: `Lab #${String(w + 1).padStart(2, "0")} instructions`,
      url: `https://example.com/labs/${w + 1}.md`,
    });
    events.push({
      id: `ev_lab_${w + 1}`,
      cohortId,
      kind: "lab",
      title: `Lab session: ${labTitle}`,
      startsAt: addDays(weekStart, 1, "19:00"),
      durationMin: 90,
      hostId: INSTRUCTOR,
    });

    events.push({
      id: `ev_oh_${w + 1}`,
      cohortId,
      kind: "office_hours",
      title: "Office hours",
      startsAt: addDays(weekStart, 2, "18:00"),
      durationMin: 60,
      hostId: INSTRUCTOR,
    });
    events.push({
      id: `ev_proj_${w + 1}`,
      cohortId,
      kind: "workshop",
      title: w === 5 ? "Capstone team work" : "Project work",
      startsAt: addDays(weekStart, 4, "17:00"),
      durationMin: 120,
      hostId: null,
    });

    if (week.assignment) {
      const [title, instructions] = week.assignment;
      const reqId = `r_req_${w + 1}`;
      resources.push({
        id: reqId,
        cohortId,
        moduleId,
        kind: "template",
        title: `${title}: requirements`,
        url: `https://example.com/assignments/${w + 1}/requirements.pdf`,
      });
      assignments.push({
        id: `a_${w + 1}`,
        cohortId,
        moduleId,
        title,
        instructions,
        dueAt: addDays(weekStart, 4, "23:59"),
        resourceIds: [reqId],
      });
    }
  });

  // AI Engineering: curriculum only (no active cohort yet).
  aiWeeks.forEach(([title, summary], w) => {
    const moduleId = `m_ai_${w + 1}`;
    modules.push({ id: moduleId, programmeId: "p_ai", week: w + 1, position: 1, title, summary });
    lessons.push({
      id: `${moduleId}_l1`,
      moduleId,
      position: 1,
      title: `${title}: overview`,
      kind: "reading",
      durationMin: 20,
      body: summary,
    });
  });

  resources.push(
    {
      id: "r_cs_k8s",
      cohortId: null,
      moduleId: "m_devops_4",
      kind: "cheatsheet",
      title: "kubectl cheat sheet",
      url: "https://example.com/cheatsheets/kubectl.pdf",
    },
    {
      id: "r_cs_tf",
      cohortId: null,
      moduleId: "m_devops_3",
      kind: "cheatsheet",
      title: "Terraform CLI cheat sheet",
      url: "https://example.com/cheatsheets/terraform.pdf",
    },
    {
      id: "r_cs_linux",
      cohortId: null,
      moduleId: "m_devops_1",
      kind: "cheatsheet",
      title: "Linux commands cheat sheet",
      url: "https://example.com/cheatsheets/linux.pdf",
    },
    {
      id: "r_tpl_readme",
      cohortId: null,
      moduleId: null,
      kind: "template",
      title: "Project README template",
      url: "https://example.com/templates/readme.md",
    },
    {
      id: "r_tpl_adr",
      cohortId: null,
      moduleId: null,
      kind: "template",
      title: "Architecture decision record template",
      url: "https://example.com/templates/adr.md",
    },
  );

  events.push({
    id: "ev_career_ama",
    cohortId: null,
    kind: "event",
    title: "Campus AMA: Breaking into DevOps",
    startsAt: addDays(startOfWeek(now), 9, "18:30"),
    durationMin: 60,
    hostId: INSTRUCTOR,
  });

  // -------------------------------------------------------------------------
  // Student progress. Ahmed has finished weeks 1-3 and started week 4.

  const lessonProgress: LessonProgress[] = [];
  const labAttempts: LabAttempt[] = [];
  const submissions: Submission[] = [];

  students.forEach((s, si) => {
    // Everyone is roughly on pace; a few are a week behind.
    const weeksDone = s.id === DEMO_USER_ID ? 3 : si % 4 === 3 ? 2 : 3;
    lessons
      .filter((l) => l.moduleId.startsWith("m_devops_"))
      .forEach((l) => {
        const week = Number(l.moduleId.split("_")[2]);
        const extra = s.id === DEMO_USER_ID ? 1 : si % 2;
        if (week <= weeksDone || (week === weeksDone + 1 && l.position <= extra)) {
          lessonProgress.push({
            userId: s.id,
            lessonId: l.id,
            completedAt: addDays(cohortStart, week * 7 - 3, "20:00"),
          });
        }
      });

    labs.forEach((lab) => {
      if (lab.number <= weeksDone) {
        labAttempts.push({ labId: lab.id, userId: s.id, status: "passed", updatedAt: addDays(lab.dueAt, -1) });
      } else if (lab.number === 4) {
        const status =
          s.id === DEMO_USER_ID
            ? "in_progress"
            : si % 3 === 0
              ? "submitted"
              : si % 3 === 1
                ? "in_progress"
                : "not_started";
        if (status !== "not_started") {
          labAttempts.push({ labId: lab.id, userId: s.id, status, updatedAt: addDays(now, -1) });
        }
      }
    });

    assignments.forEach((a, ai) => {
      const n = ai + 1;
      if (n > 3) return;
      // John is late on #3, Sarah hasn't submitted #3.
      if (s.id === "u_sarah" && n === 3) return;
      const late = s.id === "u_john" && n === 3;
      const submittedAt = late ? addDays(a.dueAt, 1, "10:00") : addDays(a.dueAt, -1, "21:00");
      const graded = n < 3;
      submissions.push({
        id: `sub_${a.id}_${s.id}`,
        assignmentId: a.id,
        userId: s.id,
        repoUrl: `https://github.com/${s.handle}/devops-assignment-${n}`,
        note: "",
        submittedAt,
        grade: graded ? 70 + ((si * 7 + n * 5) % 28) : null,
        feedback: graded ? "Solid work. Tighten naming and add a README section on how to tear it down." : null,
      });
    });
  });

  // -------------------------------------------------------------------------
  // Community

  const spaces: Space[] = [
    {
      id: "s_announcements",
      slug: "announcements",
      name: "Announcements",
      group: "General",
      description: "News from the AcadeMe team.",
      cohortId: null,
      readOnly: true,
    },
    {
      id: "s_intros",
      slug: "introductions",
      name: "Introductions",
      group: "General",
      description: "Say hi. Where you're from, what you do, what you want to build.",
      cohortId: null,
      readOnly: false,
    },
    {
      id: "s_wins",
      slug: "wins",
      name: "Wins",
      group: "General",
      description: "Passed a cert, shipped a thing, got the job. Share it.",
      cohortId: null,
      readOnly: false,
    },
    {
      id: "s_azure",
      slug: "azure",
      name: "Azure",
      group: "DevOps",
      description: "Everything Azure.",
      cohortId: null,
      readOnly: false,
    },
    {
      id: "s_aws",
      slug: "aws",
      name: "AWS",
      group: "DevOps",
      description: "Everything AWS.",
      cohortId: null,
      readOnly: false,
    },
    {
      id: "s_k8s",
      slug: "kubernetes",
      name: "Kubernetes",
      group: "DevOps",
      description: "Clusters, manifests, Helm, and the occasional CrashLoopBackOff.",
      cohortId: null,
      readOnly: false,
    },
    {
      id: "s_tf",
      slug: "terraform",
      name: "Terraform",
      group: "DevOps",
      description: "IaC patterns, modules and state horror stories.",
      cohortId: null,
      readOnly: false,
    },
    {
      id: "s_cv",
      slug: "cv-linkedin",
      name: "CV & LinkedIn",
      group: "Career",
      description: "Get feedback on how you present your work.",
      cohortId: null,
      readOnly: false,
    },
    {
      id: "s_interviews",
      slug: "interviews",
      name: "Interviews",
      group: "Career",
      description: "Questions you got asked, and how you answered.",
      cohortId: null,
      readOnly: false,
    },
    {
      id: "s_jobs",
      slug: "jobs",
      name: "Jobs",
      group: "Career",
      description: "Roles worth applying for.",
      cohortId: null,
      readOnly: false,
    },
    {
      id: "s_showcase",
      slug: "showcase",
      name: "Project Showcase",
      group: "Student Projects",
      description: "Show what you built.",
      cohortId: null,
      readOnly: false,
    },
    {
      id: "s_feedback",
      slug: "feedback",
      name: "Feedback",
      group: "Student Projects",
      description: "Ask for a review before you ship.",
      cohortId: null,
      readOnly: false,
    },
    {
      id: "s_c01_general",
      slug: "cohort-01-general",
      name: "General",
      group: "Cohort #01",
      description: "Your cohort's home.",
      cohortId,
      readOnly: false,
    },
    {
      id: "s_c01_announcements",
      slug: "cohort-01-announcements",
      name: "Announcements",
      group: "Cohort #01",
      description: "Schedule changes and cohort news.",
      cohortId,
      readOnly: true,
    },
    {
      id: "s_c01_questions",
      slug: "cohort-01-questions",
      name: "Questions",
      group: "Cohort #01",
      description: "Stuck? Ask here. No question is too basic.",
      cohortId,
      readOnly: false,
    },
    {
      id: "s_c01_labs",
      slug: "cohort-01-labs",
      name: "Labs",
      group: "Cohort #01",
      description: "Lab help and solutions discussion (after the deadline).",
      cohortId,
      readOnly: false,
    },
    {
      id: "s_c01_projects",
      slug: "cohort-01-projects",
      name: "Projects",
      group: "Cohort #01",
      description: "Capstone teams and progress.",
      cohortId,
      readOnly: false,
    },
  ];

  const ago = (hours: number) => new Date(now.getTime() - hours * 3_600_000);

  const posts: Post[] = [
    {
      id: "po_1",
      spaceId: "s_c01_announcements",
      authorId: INSTRUCTOR,
      title: "Week 4: Kubernetes",
      body: "Welcome to week 4. Lab #04 (Deploy an AKS cluster) is live and due Sunday. Thursday's class covers Kubernetes Networking, so please finish the Services lesson first.\n\nOffice hours are Wednesday at 18:00 as usual.",
      createdAt: ago(52),
      pinned: true,
    },
    {
      id: "po_2",
      spaceId: "s_c01_questions",
      authorId: "u_maria",
      title: "AKS node pool stuck in 'Creating'",
      body: "My node pool has been stuck in Creating for 20 minutes. Quota looks fine. Anyone seen this?",
      createdAt: ago(5),
      pinned: false,
    },
    {
      id: "po_3",
      spaceId: "s_c01_labs",
      authorId: "u_omar",
      title: "Lab #04 tip: check your subnet size",
      body: "If you're using Azure CNI, a /24 runs out fast. I went to /22 for the node subnet and everything came up.",
      createdAt: ago(20),
      pinned: false,
    },
    {
      id: "po_4",
      spaceId: "s_c01_general",
      authorId: "u_lena",
      title: "Study group Saturday?",
      body: "Anyone up for a 2-hour Kubernetes study session on Saturday morning? Thinking 10:00 on a call. @ahmed @sarah",
      createdAt: ago(30),
      pinned: false,
    },
    {
      id: "po_5",
      spaceId: "s_intros",
      authorId: "u_emma",
      title: "Hi from Utrecht",
      body: "Eight years in finance, now making the jump into cloud. Terraform is the first thing that's made me feel like an engineer.",
      createdAt: ago(400),
      pinned: false,
    },
    {
      id: "po_6",
      spaceId: "s_wins",
      authorId: "u_priya",
      title: "Passed AZ-104",
      body: "Passed this morning. The networking week here carried me through half the exam.",
      createdAt: ago(28),
      pinned: false,
    },
    {
      id: "po_7",
      spaceId: "s_k8s",
      authorId: "u_ali",
      title: "Readable explanation of Services vs Ingress",
      body: "Service = stable address for a set of pods inside the cluster. Ingress = HTTP routing from outside into Services. Took me way too long to see it that simply.",
      createdAt: ago(70),
      pinned: false,
    },
    {
      id: "po_8",
      spaceId: "s_tf",
      authorId: "u_tom",
      title: "Remote state locking saved me today",
      body: "Two pipelines ran apply at the same time. The storage lease blocked the second one. Lab #03 paying off.",
      createdAt: ago(90),
      pinned: false,
    },
    {
      id: "po_9",
      spaceId: "s_announcements",
      authorId: INSTRUCTOR,
      title: "AI Engineering cohort #02 is open",
      body: "Enrolment for AI Engineering is open. Current students get priority seats.",
      createdAt: ago(120),
      pinned: true,
    },
    {
      id: "po_10",
      spaceId: "s_interviews",
      authorId: "u_lucas",
      title: "Got asked to explain a rolling deployment",
      body: "Final round question: walk through what happens during a rolling update and how you'd roll back. Worth practising out loud.",
      createdAt: ago(200),
      pinned: false,
    },
    {
      id: "po_11",
      spaceId: "s_showcase",
      authorId: "u_sarah",
      title: "My landing zone, diagrammed",
      body: "Finished assignment #03 with a full hub-spoke, policies and a pipeline. Feedback welcome.",
      createdAt: ago(60),
      pinned: false,
    },
  ];

  const comments: Comment[] = [
    {
      id: "co_1",
      postId: "po_2",
      authorId: "u_omar",
      body: "Check the activity log on the node resource group. Mine was a VM SKU not available in the region.",
      createdAt: ago(4),
    },
    {
      id: "co_2",
      postId: "po_2",
      authorId: INSTRUCTOR,
      body: "Omar's right. Try Standard_D2s_v5 and a different zone. We'll cover this Thursday.",
      createdAt: ago(3),
    },
    { id: "co_3", postId: "po_4", authorId: "u_sarah", body: "In. 10:00 works.", createdAt: ago(26) },
    { id: "co_4", postId: "po_4", authorId: "u_john", body: "Count me in too.", createdAt: ago(25) },
    { id: "co_5", postId: "po_6", authorId: "u_ahmed", body: "Congrats Priya!", createdAt: ago(27) },
    { id: "co_6", postId: "po_3", authorId: "u_ahmed", body: "This fixed mine. Thanks.", createdAt: ago(18) },
    {
      id: "co_7",
      postId: "po_11",
      authorId: INSTRUCTOR,
      body: "Clean. Consider moving the policy assignments into their own module.",
      createdAt: ago(40),
    },
  ];

  const reactions: Reaction[] = [];
  const react = (postId: string, emoji: string, userIds: string[]) =>
    userIds.forEach((userId) => reactions.push({ postId, userId, emoji }));
  react("po_1", "👍", ["u_maria", "u_john", "u_sarah", "u_omar", "u_lena"]);
  react("po_3", "🔥", ["u_ahmed", "u_maria", "u_tom", "u_priya"]);
  react("po_6", "🎉", ["u_ahmed", "u_lena", "u_nadia", "u_emma", "u_ali", "u_tom"]);
  react("po_7", "💡", ["u_nadia", "u_lucas"]);
  react("po_11", "🔥", ["u_omar", "u_ali"]);

  const notifications: Notification[] = [
    {
      id: "n_1",
      userId: DEMO_USER_ID,
      text: "Rakan replied in “AKS node pool stuck in 'Creating'”",
      href: "/community/cohort-01-questions/po_2",
      createdAt: ago(3),
      readAt: null,
    },
    {
      id: "n_2",
      userId: DEMO_USER_ID,
      text: "Lena mentioned you in “Study group Saturday?”",
      href: "/community/cohort-01-general/po_4",
      createdAt: ago(30),
      readAt: null,
    },
    {
      id: "n_3",
      userId: DEMO_USER_ID,
      text: "Your assignment “Design an Azure hub-spoke network” was graded",
      href: "/cohorts/c_devops_01/assignments/a_2",
      createdAt: ago(48),
      readAt: null,
    },
    {
      id: "n_4",
      userId: DEMO_USER_ID,
      text: "New announcement: Week 4: Kubernetes",
      href: "/community/cohort-01-announcements/po_1",
      createdAt: ago(52),
      readAt: ago(40),
    },
    {
      id: "n_5",
      userId: DEMO_USER_ID,
      text: "Lab #03 marked as passed",
      href: "/cohorts/c_devops_01/labs",
      createdAt: ago(100),
      readAt: ago(90),
    },
  ];

  return {
    profiles,
    programmes,
    modules,
    lessons,
    cohorts,
    cohortMembers,
    classes,
    attendance,
    labs,
    labAttempts,
    assignments,
    submissions,
    resources,
    events,
    spaces,
    posts,
    comments,
    reactions,
    notifications,
    lessonProgress,
  };
}
