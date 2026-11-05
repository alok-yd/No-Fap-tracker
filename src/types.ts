export type GoalMode = "pornography" | "masturbation" | "both" | "awareness";
export type ChallengeStatus = "active" | "paused" | "completed";
export type ChallengeKind = "Beginner" | "Intermediate" | "Advanced" | "Pro";

export interface Challenge {
  id: string;
  kind: ChallengeKind;
  targetDays: number;
  goalMode: GoalMode;
  startDate: string;
  status: ChallengeStatus;
  pausedAt?: string;
  pausedDays: number;
  createdAt: string;
}

export interface DailyLog {
  date: string;
  pornographyUsed: boolean;
  masturbationReported: boolean;
  urgeIntensity: number;
  moods: string[];
  triggers: string[];
  urgeManaged: boolean;
  exerciseCompleted: boolean;
  sleepHours: number;
  productivity: number;
  reflection: string;
  learned: string;
  tomorrow: string;
  updatedAt: string;
}

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  moods: string[];
  triggers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RelapseEntry {
  id: string;
  date: string;
  behaviour: "pornography" | "masturbation" | "both";
  trigger: string;
  emotion: string;
  planned: boolean;
  reflection: string;
}

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  completions: Record<string, boolean>;
}

export interface UserPreferences {
  name: string;
  goals: string[];
  aiEnabled: boolean;
  aiConsent: boolean;
  notificationsEnabled: boolean;
  morningReminder: string;
  eveningReminder: string;
}

export interface AppData {
  preferences: UserPreferences;
  challenges: Challenge[];
  dailyLogs: Record<string, DailyLog>;
  journalEntries: JournalEntry[];
  relapseEntries: RelapseEntry[];
  habits: Habit[];
}

export const defaultHabits: Omit<Habit, "id" | "completions">[] = [
  { name: "Exercise", emoji: "🏃" },
  { name: "Meditation", emoji: "🧘" },
  { name: "Reading", emoji: "📖" },
  { name: "Focused work", emoji: "🎯" },
  { name: "Drink water", emoji: "💧" },
  { name: "Healthy sleep", emoji: "🌙" },
  { name: "Limit screen time", emoji: "📵" },
  { name: "Spend time outdoors", emoji: "🌿" }
];

export function createInitialData(): AppData {
  return {
    preferences: {
      name: "",
      goals: [],
      aiEnabled: false,
      aiConsent: false,
      notificationsEnabled: false,
      morningReminder: "08:00",
      eveningReminder: "21:00"
    },
    challenges: [],
    dailyLogs: {},
    journalEntries: [],
    relapseEntries: [],
    habits: defaultHabits.map((habit, index) => ({
      ...habit,
      id: "habit-" + (index + 1),
      completions: {}
    }))
  };
}