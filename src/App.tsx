import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowRight, Award, BarChart3, BookOpen, Brain, Check, CheckCircle2,
  ChevronDown, ChevronRight, CircleHelp, Clock3, Compass, Download, Flame, Heart,
  Home, Lightbulb, LogIn, LogOut, Menu, MessageCircle, Moon, MoreHorizontal,
  Pause, Play, Plus, RefreshCw, Search, Settings, ShieldCheck, Sparkles, Target,
  Trash2, TrendingUp, UserRound, Wind, X, Zap
} from "lucide-react";
import type {
  AppData, Challenge, ChallengeKind, DailyLog, GoalMode, Habit, JournalEntry, RelapseEntry
} from "./types";
import { createInitialData } from "./types";
import { addDays, calculateStreak, challengeDay, dateKey, formatDate, lastNDates, remainingDays } from "./lib/dates";
import { clearLocalData, exportData, loadLocalData, makeId, saveLocalData } from "./lib/storage";
import {
  firebaseConfigured, loginAccount, logoutAccount, readCloudData, registerAccount,
  requestPersonalInsight, watchAuth, writeCloudData
} from "./lib/firebase";
import type { User } from "firebase/auth";

type Section = "Home" | "Tracker" | "Journal" | "Insights" | "Profile";
type Modal = "checkin" | "challenge" | "journal" | "relapse" | "auth" | "urge" | null;

const navItems: { id: Section; icon: typeof Home }[] = [
  { id: "Home", icon: Home }, { id: "Tracker", icon: Target }, { id: "Journal", icon: BookOpen },
  { id: "Insights", icon: BarChart3 }, { id: "Profile", icon: UserRound }
];

const moods = ["Happy", "Motivated", "Confident", "Relaxed", "Neutral", "Bored", "Stressed", "Lonely", "Sad", "Anxious", "Frustrated"];
const triggers = ["Boredom", "Loneliness", "Stress", "Anxiety", "Sexual content", "Social media", "Late-night phone use", "Being alone", "Sexual thoughts", "Other"];
const categories = ["Daily thoughts", "Urge experiences", "Emotional reflections", "Motivation", "Personal achievements", "Difficult days", "Lessons learned"];
const learning = [
  { title: "Dopamine & reward", group: "Brain basics", read: "5 min", body: "Dopamine is involved in motivation, learning and reward prediction. It is not simply a pleasure chemical, and everyday activities do not permanently deplete it. Repeated cues can become associated with behaviours, which is one reason noticing patterns can be useful.", takeaway: "Notice cues and build alternative routines; avoid the idea of a timed 'dopamine reset'." },
  { title: "How habits form", group: "Behaviour", read: "4 min", body: "Habits are learned associations between contexts and actions. Repetition in a stable context can make a response easier to initiate. Making a desired action obvious and easy, while adding friction to an unwanted routine, can support behaviour change.", takeaway: "Change the context as well as relying on willpower." },
  { title: "Neuroplasticity", group: "Brain basics", read: "4 min", body: "The nervous system can adapt with experience. Learning and practice change networks over time, but there is no universal 30- or 90-day timetable for a brain to 'reset'. Progress differs across people and behaviours.", takeaway: "Focus on repeated, realistic practice rather than a promised deadline." },
  { title: "Compulsive sexual behaviour", group: "Understanding behaviour", read: "6 min", body: "WHO's ICD-11 includes compulsive sexual behaviour disorder under impulse control disorders. The diagnosis concerns a persistent pattern of failure to control intense, repetitive sexual impulses or urges that results in marked distress or impairment. Distress based only on moral disapproval is not sufficient for diagnosis.", takeaway: "Frequency alone does not define a disorder. A qualified clinician can assess persistent distress or impairment." },
  { title: "Pornography & conditioning", group: "Understanding behaviour", read: "5 min", body: "People's experiences with pornography vary. For some, certain cues, contexts or routines may become associated with use. Research findings are mixed and associations do not prove that pornography caused a particular outcome.", takeaway: "Track your own experience without assuming that every person is affected in the same way." },
  { title: "Emotional regulation", group: "Wellbeing", read: "4 min", body: "Emotional regulation includes noticing a feeling, naming it, allowing it to be present and choosing a response that fits your values. Suppressing an urge is not the only option; creating space between feeling and action can help.", takeaway: "Try naming the emotion before choosing your next action." },
  { title: "Impulse control", group: "Behaviour", read: "4 min", body: "Impulses often rise and fall. Delaying a decision, changing location, reducing access to a cue and contacting a supportive person are practical strategies. The best strategy is the one that is safe and workable for you.", takeaway: "Prepare a short, repeatable plan for difficult moments." },
  { title: "Stress & coping", group: "Wellbeing", read: "4 min", body: "Stress can affect attention, sleep and decision-making. Movement, problem-solving, social support and relaxation practice can support wellbeing, but no single technique works for everyone.", takeaway: "Build a coping menu and test what helps in your own circumstances." },
  { title: "Sleep & behaviour", group: "Wellbeing", read: "3 min", body: "Sleep supports mood, attention and executive functioning. Late-night routines can also create predictable contexts for habits. Consistent sleep and device boundaries may help some people.", takeaway: "Experiment with a realistic wind-down routine." },
  { title: "Relapse prevention", group: "Behaviour", read: "5 min", body: "A lapse can be reviewed as information, not a verdict about character. Look at the context, emotion, availability of alternatives and what support would make the next situation easier. Avoid all-or-nothing thinking.", takeaway: "Write one adjustment you can test, then move forward." }
];

function cn(...parts: (string | false | undefined)[]): string { return parts.filter(Boolean).join(" "); }

function SectionTitle({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return <div className="section-title"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("card", className)}>{children}</section>;
}
function Pill({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "green" | "amber" | "purple" | "gray" }) {
  return <span className={"pill pill-" + tone}>{children}</span>;
}
function Empty({ icon: Icon = Compass, title, body, action }: { icon?: typeof Compass; title: string; body: string; action?: React.ReactNode }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={22} /></span><h3>{title}</h3><p>{body}</p>{action}</div>;
}
function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return <button type="button" role="switch" aria-checked={checked} className={cn("toggle", checked && "toggle-on")} onClick={() => onChange(!checked)}><span /></button>;
}
function ModalShell({ title, subtitle, onClose, children, wide = false }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={cn("modal", wide && "modal-wide")} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
      {children}
    </div>
  </div>;
}

function App() {
  const [data, setData] = useState<AppData>(() => loadLocalData());
  const [section, setSection] = useState<Section>("Home");
  const [modal, setModal] = useState<Modal>(null);
  const [editingJournal, setEditingJournal] = useState<JournalEntry | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<typeof learning[number] | null>(null);
  const [today] = useState(dateKey());
  const [toast, setToast] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [syncState, setSyncState] = useState<"local" | "syncing" | "synced" | "error">("local");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [journalQuery, setJournalQuery] = useState("");
  const [journalFilter, setJournalFilter] = useState("All");
  const [insightRange, setInsightRange] = useState(7);
  const [urgeStep, setUrgeStep] = useState<"menu" | "timer" | "breathing" | "surfing">("menu");
  const [timer, setTimer] = useState(600);
  const [breathPhase, setBreathPhase] = useState("Inhale");
  const [breathSecond, setBreathSecond] = useState(4);
  const [checkForm, setCheckForm] = useState({
    pornographyUsed: false, masturbationReported: false, urgeIntensity: 3, moods: [] as string[],
    triggers: [] as string[], urgeManaged: false, exerciseCompleted: false, sleepHours: 7,
    productivity: 3, reflection: "", learned: "", tomorrow: ""
  });
  const [challengeForm, setChallengeForm] = useState<{ kind: ChallengeKind; targetDays: number; goalMode: GoalMode; startDate: string }>({
    kind: "Beginner", targetDays: 30, goalMode: "both", startDate: today
  });
  const [journalForm, setJournalForm] = useState({ title: "", content: "", category: "Daily thoughts", moods: [] as string[], triggers: [] as string[] });
  const [relapseForm, setRelapseForm] = useState({ behaviour: "both" as RelapseEntry["behaviour"], trigger: "", emotion: "", planned: false, reflection: "" });

  useEffect(() => {
    try { saveLocalData(data); } catch (error) { showToast(error instanceof Error ? error.message : "Could not save your data."); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => watchAuth(async (nextUser) => {
    setUser(nextUser);
    if (!nextUser) { setSyncState("local"); return; }
    setSyncState("syncing");
    try {
      const cloud = await readCloudData(nextUser.uid);
      if (cloud) setData(cloud);
      else await writeCloudData(nextUser.uid, data);
      setSyncState("synced");
    } catch (error) {
      console.error(error);
      setSyncState("error");
    }
  }), []);

  useEffect(() => {
    if (!user) return;
    setSyncState("syncing");
    const handle = window.setTimeout(async () => {
      try { await writeCloudData(user.uid, data); setSyncState("synced"); }
      catch (error) { console.error(error); setSyncState("error"); }
    }, 700);
    return () => window.clearTimeout(handle);
  }, [data, user]);

  useEffect(() => {
    if (modal !== "urge" || urgeStep !== "timer" || timer <= 0) return;
    const id = window.setInterval(() => setTimer((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, [modal, urgeStep, timer]);

  useEffect(() => {
    if (modal !== "urge" || urgeStep !== "breathing") return;
    const id = window.setInterval(() => {
      setBreathSecond((value) => {
        if (value > 1) return value - 1;
        setBreathPhase((phase) => phase === "Inhale" ? "Hold" : phase === "Hold" ? "Exhale" : "Inhale");
        return breathPhase === "Inhale" ? 2 : breathPhase === "Hold" ? 6 : 4;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [modal, urgeStep, breathPhase]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }
  function updateData(updater: (current: AppData) => AppData) { setData((current) => updater(current)); }
  const activeChallenge = useMemo(() => data.challenges.find((item) => item.status === "active" || item.status === "paused") || null, [data.challenges]);
  const activeDay = activeChallenge ? challengeDay(activeChallenge.startDate, today, activeChallenge.pausedDays, activeChallenge.status, activeChallenge.pausedAt) : 0;
  const challengeProgress = activeChallenge ? Math.min(100, Math.round((Math.min(activeDay, activeChallenge.targetDays) / activeChallenge.targetDays) * 100)) : 0;
  const streak = activeChallenge ? calculateStreak(data.dailyLogs, activeChallenge.goalMode, today) : 0;
  const completedDays = Object.values(data.dailyLogs).filter((log) => activeChallenge && (
    activeChallenge.goalMode === "awareness" ||
    (activeChallenge.goalMode === "pornography" && !log.pornographyUsed) ||
    (activeChallenge.goalMode === "masturbation" && !log.masturbationReported) ||
    (activeChallenge.goalMode === "both" && !log.pornographyUsed && !log.masturbationReported)
  )).length;
  const longestStreak = useMemo(() => {
    if (!activeChallenge) return 0;
    const keys = Object.keys(data.dailyLogs).sort();
    let best = 0; let run = 0; let previous = "";
    for (const key of keys) {
      const log = data.dailyLogs[key];
      const meets = activeChallenge.goalMode === "awareness" ||
        (activeChallenge.goalMode === "pornography" && !log.pornographyUsed) ||
        (activeChallenge.goalMode === "masturbation" && !log.masturbationReported) ||
        (activeChallenge.goalMode === "both" && !log.pornographyUsed && !log.masturbationReported);
      if (meets) {
        run = previous && addDays(previous, 1) === key ? run + 1 : 1;
        best = Math.max(best, run);
      } else run = 0;
      previous = key;
    }
    return best;
  }, [activeChallenge, data.dailyLogs]);
  const todayLog = data.dailyLogs[today];
  const last7 = lastNDates(7, today);
  const weeklyLogs = last7.map((key) => data.dailyLogs[key]).filter(Boolean);
  const averageUrge = weeklyLogs.length ? weeklyLogs.reduce((sum, log) => sum + log.urgeIntensity, 0) / weeklyLogs.length : 0;

  function openCheckin() {
    const existing = data.dailyLogs[today];
    setCheckForm(existing ? {
      pornographyUsed: existing.pornographyUsed, masturbationReported: existing.masturbationReported,
      urgeIntensity: existing.urgeIntensity, moods: existing.moods, triggers: existing.triggers,
      urgeManaged: existing.urgeManaged, exerciseCompleted: existing.exerciseCompleted, sleepHours: existing.sleepHours,
      productivity: existing.productivity, reflection: existing.reflection, learned: existing.learned, tomorrow: existing.tomorrow
    } : {
      pornographyUsed: false, masturbationReported: false, urgeIntensity: 3, moods: [], triggers: [],
      urgeManaged: false, exerciseCompleted: false, sleepHours: 7, productivity: 3, reflection: "", learned: "", tomorrow: ""
    });
    setModal("checkin");
  }
  function saveCheckin(event: React.FormEvent) {
    event.preventDefault();
    const log: DailyLog = { ...checkForm, date: today, updatedAt: new Date().toISOString() };
    updateData((current) => ({ ...current, dailyLogs: { ...current.dailyLogs, [today]: log } }));
    setModal(null); showToast("Daily check-in saved. Thank you for checking in.");
  }
  function saveChallenge(event: React.FormEvent) {
    event.preventDefault();
    const item: Challenge = { id: makeId(), ...challengeForm, status: "active", pausedDays: 0, createdAt: new Date().toISOString() };
    updateData((current) => ({ ...current, challenges: current.challenges.map((challenge) => challenge.status === "active" ? { ...challenge, status: "completed" } : challenge).concat(item) }));
    setModal(null); showToast("Your new challenge is ready.");
  }
  function toggleChallenge() {
    if (!activeChallenge) return;
    updateData((current) => ({
      ...current,
      challenges: current.challenges.map((item) => item.id !== activeChallenge.id ? item : item.status === "active"
        ? { ...item, status: "paused", pausedAt: today }
        : { ...item, status: "active", pausedDays: item.pausedDays + (item.pausedAt ? Math.max(0, Math.round((new Date(today + "T12:00:00").getTime() - new Date(item.pausedAt + "T12:00:00").getTime()) / 86400000)) : 0), pausedAt: undefined })
    }));
    showToast(activeChallenge.status === "active" ? "Challenge paused." : "Challenge resumed.");
  }
  function saveJournal(event: React.FormEvent) {
    event.preventDefault();
    const now = new Date().toISOString();
    const entry: JournalEntry = {
      id: editingJournal?.id || makeId(), ...journalForm,
      createdAt: editingJournal?.createdAt || now, updatedAt: now
    };
    updateData((current) => ({
      ...current,
      journalEntries: editingJournal
        ? current.journalEntries.map((item) => item.id === entry.id ? entry : item)
        : [entry, ...current.journalEntries]
    }));
    setModal(null); setEditingJournal(null); showToast(editingJournal ? "Journal entry updated." : "Journal entry saved.");
  }
  function openNewJournal() {
    setEditingJournal(null);
    setJournalForm({ title: "", content: "", category: "Daily thoughts", moods: [], triggers: [] });
    setModal("journal");
  }
  function openEditJournal(entry: JournalEntry) {
    setEditingJournal(entry);
    setJournalForm({ title: entry.title, content: entry.content, category: entry.category, moods: entry.moods, triggers: entry.triggers });
    setModal("journal");
  }
  function deleteJournal(id: string) {
    if (!window.confirm("Delete this journal entry? This cannot be undone.")) return;
    updateData((current) => ({ ...current, journalEntries: current.journalEntries.filter((entry) => entry.id !== id) }));
    showToast("Entry deleted.");
  }
  function saveRelapse(event: React.FormEvent) {
    event.preventDefault();
    const entry: RelapseEntry = { id: makeId(), date: new Date().toISOString(), ...relapseForm };
    updateData((current) => ({ ...current, relapseEntries: [entry, ...current.relapseEntries] }));
    setModal(null); setRelapseForm({ behaviour: "both", trigger: "", emotion: "", planned: false, reflection: "" });
    showToast("Your report is saved as information for future learning.");
  }
  function toggleHabit(habit: Habit) {
    updateData((current) => ({
      ...current,
      habits: current.habits.map((item) => item.id === habit.id
        ? { ...item, completions: { ...item.completions, [today]: !item.completions[today] } } : item)
    }));
  }
  function addHabit() {
    const name = window.prompt("What habit would you like to build?");
    if (!name?.trim()) return;
    updateData((current) => ({ ...current, habits: [...current.habits, { id: makeId(), name: name.trim(), emoji: "✨", completions: {} }] }));
  }
  async function generateAI() {
    if (!data.preferences.aiEnabled || !data.preferences.aiConsent) {
      showToast("Enable AI and provide consent in Profile before requesting an insight."); return;
    }
    setAiBusy(true); setAiResult("");
    try {
      const logs = Object.entries(data.dailyLogs).sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([date, log]) => ({
        date, urgeIntensity: log.urgeIntensity, moods: log.moods, triggers: log.triggers,
        exerciseCompleted: log.exerciseCompleted, sleepHours: log.sleepHours,
        pornographyUsed: log.pornographyUsed, masturbationReported: log.masturbationReported
      }));
      const response = await requestPersonalInsight({ consent: true, logs });
      setAiResult(response); showToast("Your personal reflection is ready.");
    } catch (error) {
      setAiResult(error instanceof Error ? error.message : "AI guidance is unavailable right now.");
    } finally { setAiBusy(false); }
  }
  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAuthBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const email = String(form.get("email") || "");
      const password = String(form.get("password") || "");
      const mode = String(form.get("mode") || "login");
      const signed = mode === "register" ? await registerAccount(email, password) : await loginAccount(email, password);
      setUser(signed); setModal(null); showToast("Signed in successfully.");
    } catch (error) { showToast(error instanceof Error ? error.message : "Could not sign in."); }
    finally { setAuthBusy(false); }
  }
  async function signOutUser() {
    await logoutAccount(); setUser(null); showToast("Signed out. Your local copy remains on this device.");
  }

  const name = data.preferences.name.trim() || (user?.displayName || "there").split(" ")[0];
  const completedHabitsToday = data.habits.filter((habit) => habit.completions[today]).length;
  const journalMatches = data.journalEntries.filter((entry) =>
    (journalFilter === "All" || entry.category === journalFilter) &&
    (entry.title + " " + entry.content).toLowerCase().includes(journalQuery.toLowerCase())
  );
  const chartLogs = lastNDates(insightRange, today).map((key) => ({ key, log: data.dailyLogs[key] })).filter((item) => item.log);
  const triggerCounts = Object.entries(chartLogs.flatMap((item) => item.log?.triggers || []).reduce<Record<string, number>>((acc, trigger) => {
    acc[trigger] = (acc[trigger] || 0) + 1; return acc;
  }, {})).sort((a, b) => b[1] - a[1]);

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><Sparkles size={19} /></span><div><b>NOFAP</b><small>RECLAIM YOUR CONTROL</small></div></div>
      <div className="sidebar-label">WORKSPACE</div>
      <nav className="side-nav">
        {navItems.map(({ id, icon: Icon }) => <button key={id} className={cn("nav-link", section === id && "nav-active")} onClick={() => setSection(id)}><Icon size={19} /><span>{id}</span>{section === id && <span className="nav-dot" />}</button>)}
      </nav>
      <div className="sidebar-spacer" />
      <div className="side-quote"><span className="quote-spark"><Lightbulb size={16} /></span><p>Progress is built one thoughtful choice at a time.</p><small>YOUR DAILY REMINDER</small></div>
      <button className="nav-link sidebar-settings" onClick={() => setSection("Profile")}><Settings size={18} /><span>Settings</span></button>
      <div className="sidebar-user"><span className="avatar">{name.slice(0, 1).toUpperCase()}</span><div><b>{name}</b><small>{user ? "Cloud account" : "Personal space"}</small></div><MoreHorizontal size={18} /></div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <div className="mobile-brand"><span className="brand-mark"><Sparkles size={17} /></span><b>NOFAP</b></div>
        <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><b>{section}</b></div>
        <div className="top-actions"><span className={cn("sync-dot", "sync-" + syncState)} /> <span className="sync-label">{syncState === "synced" ? "Synced" : syncState === "syncing" ? "Syncing" : syncState === "error" ? "Sync issue" : "Saved on device"}</span><button className="top-avatar" onClick={() => setSection("Profile")}>{name.slice(0, 1).toUpperCase()}</button></div>
      </header>

      <div className="page-content">
        {section === "Home" && <div className="page-stack">
          <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> YOUR PERSONAL SPACE</div><h1>Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {name} <span className="wave">✦</span></h1><p>Every day is a new opportunity to understand yourself and move forward.</p></div><div className="date-chip"><span><Moon size={15} /></span>{formatDate(today, { weekday: "long", month: "short", day: "numeric" })}</div></div>

          <div className="home-grid">
            <Card className="challenge-card">
              <div className="card-topline"><span className="eyebrow">YOUR CURRENT JOURNEY</span><Pill tone={activeChallenge?.status === "paused" ? "amber" : activeChallenge ? "green" : "gray"}>{activeChallenge ? activeChallenge.status : "Not started"}</Pill></div>
              {activeChallenge ? <div className="challenge-layout">
                <div className="challenge-copy"><div className="challenge-tag"><span className="mini-symbol"><Target size={14} /></span>{activeChallenge.kind} challenge</div><h2>One day at a time.</h2><p>Your goal is personal. Keep showing up with honesty and curiosity.</p><div className="challenge-stats"><div><b>Day {Math.min(activeDay, activeChallenge.targetDays)}</b><span>of {activeChallenge.targetDays} days</span></div><div className="stat-divider" /><div><b>{remainingDays(activeDay, activeChallenge.targetDays)}</b><span>days remaining</span></div></div><div className="progress-track"><span style={{ width: challengeProgress + "%" }} /></div><div className="progress-meta"><span>{challengeProgress}% completed</span><span>{activeChallenge.goalMode === "awareness" ? "Awareness goal" : activeChallenge.goalMode === "both" ? "Porn + masturbation" : activeChallenge.goalMode === "pornography" ? "Pornography goal" : "Masturbation goal"}</span></div><div className="challenge-actions"><button className="btn btn-primary" onClick={openCheckin}>{todayLog ? "Update check-in" : "Daily check-in"}<ArrowRight size={16} /></button><button className="btn btn-secondary" onClick={toggleChallenge}>{activeChallenge.status === "active" ? <Pause size={15} /> : <Play size={15} />}{activeChallenge.status === "active" ? "Pause" : "Resume"}</button></div></div>
                <div className="ring-wrap"><div className="progress-ring" style={{ background: "conic-gradient(#7770eb " + challengeProgress + "%, #eef0ff 0)" }}><div><strong>{challengeProgress}<small>%</small></strong><span>COMPLETE</span></div></div><div className="ring-caption"><Sparkles size={14} /> Keep your focus on today</div></div>
              </div> : <div className="no-challenge"><div className="no-challenge-icon"><Target size={27} /></div><div><h2>Your journey starts here.</h2><p>Choose a challenge that fits your goals, or start with a simple awareness routine.</p><button className="btn btn-primary" onClick={() => setModal("challenge")}>Create your challenge <ArrowRight size={16} /></button></div></div>}
              <div className="challenge-footer"><span><ShieldCheck size={15} /> No shame. No pressure. Just progress.</span><button className="text-button" onClick={() => setSection("Tracker")}>View tracker <ChevronRight size={14} /></button></div>
            </Card>
            <Card className="daily-card">
              <div className="daily-icon"><Heart size={19} /></div><div className="eyebrow">DAILY CHECK-IN</div><h3>How are you feeling today?</h3><p>A quick check-in helps you notice patterns without judging yourself.</p>
              <button className="btn btn-outline full-btn" onClick={openCheckin}>{todayLog ? "Edit today's check-in" : "Complete daily check-in"}<ArrowRight size={16} /></button>
              <div className="daily-foot">{todayLog ? <><CheckCircle2 size={14} /> Checked in today</> : <><Clock3 size={14} /> Takes about 2 minutes</>}</div>
            </Card>
          </div>

          <div className="stats-grid">
            <Card className="stat-card"><span className="stat-icon lavender"><Flame size={18} /></span><span className="stat-label">CURRENT STREAK</span><strong>{streak}<small> days</small></strong><span className="stat-hint">Based on your selected goal</span></Card>
            <Card className="stat-card"><span className="stat-icon mint"><Award size={18} /></span><span className="stat-label">LONGEST STREAK</span><strong>{longestStreak}<small> days</small></strong><span className="stat-hint">Your personal best</span></Card>
            <Card className="stat-card"><span className="stat-icon peach"><CheckCircle2 size={18} /></span><span className="stat-label">LOGGED DAYS</span><strong>{Object.keys(data.dailyLogs).length}<small> days</small></strong><span className="stat-hint">Honest check-ins count</span></Card>
            <Card className="stat-card"><span className="stat-icon sky"><BookOpen size={18} /></span><span className="stat-label">JOURNAL ENTRIES</span><strong>{data.journalEntries.length}</strong><span className="stat-hint">Thoughts captured</span></Card>
          </div>

          <div className="content-grid two-col">
            <Card className="habits-card"><div className="card-heading"><div><div className="eyebrow">SMALL STEPS, BIG IMPACT</div><h3>Today's habits</h3></div><button className="text-button" onClick={() => setSection("Tracker")}>See all <ChevronRight size={14} /></button></div><div className="habit-summary"><div className="habit-progress"><span style={{ width: (data.habits.length ? completedHabitsToday / data.habits.length * 100 : 0) + "%" }} /></div><small>{completedHabitsToday} of {data.habits.length} completed</small></div><div className="habit-mini-list">{data.habits.slice(0, 4).map((habit) => <button key={habit.id} className="habit-mini" onClick={() => toggleHabit(habit)}><span className="habit-emoji">{habit.emoji}</span><span>{habit.name}</span><span className={cn("check-circle", habit.completions[today] && "checked")}><Check size={13} /></span></button>)}</div></Card>
            <Card className="insight-preview"><div className="preview-orb"><Brain size={21} /></div><div className="eyebrow">A MOMENT TO REFLECT</div><h3>Awareness creates room for choice.</h3><p>{weeklyLogs.length ? "You've saved " + weeklyLogs.length + " check-ins in the last 7 days. Your average urge intensity is " + averageUrge.toFixed(1) + "/10. Keep noticing what feels different." : "As you check in, your personal insights will begin to take shape. Start by noticing how you feel."}</p><button className="text-button" onClick={() => setSection("Insights")}>Explore your insights <ArrowRight size={14} /></button></Card>
          </div>

          <div className="quick-actions"><div className="quick-title"><h3>Quick actions</h3><span>Make the next helpful choice easier</span></div><div className="quick-grid">
            <button onClick={() => { setUrgeStep("menu"); setModal("urge"); }}><span className="quick-icon q-purple"><Wind size={18} /></span><b>Manage an urge</b><small>Open your toolkit</small><ChevronRight size={15} /></button>
            <button onClick={openNewJournal}><span className="quick-icon q-blue"><BookOpen size={18} /></span><b>Write a journal</b><small>Capture a thought</small><ChevronRight size={15} /></button>
            <button onClick={() => setModal("relapse")}><span className="quick-icon q-orange"><RefreshCw size={18} /></span><b>Log an experience</b><small>Learn from a lapse</small><ChevronRight size={15} /></button>
            <button onClick={() => setSection("Insights")}><span className="quick-icon q-green"><TrendingUp size={18} /></span><b>Weekly report</b><small>See your patterns</small><ChevronRight size={15} /></button>
          </div></div>
        </div>}

        {section === "Tracker" && <div className="page-stack">
          <SectionTitle eyebrow="YOUR ROUTINES & CHALLENGES" title="Tracker" subtitle="Track progress in a way that supports your goals, not guilt." action={<button className="btn btn-primary" onClick={() => setModal("challenge")}><Plus size={16} /> New challenge</button>} />
          <div className="content-grid two-col">
            <Card><div className="card-heading"><div><div className="eyebrow">CHALLENGE OVERVIEW</div><h3>{activeChallenge ? activeChallenge.kind + " challenge" : "No active challenge"}</h3></div>{activeChallenge && <Pill tone={activeChallenge.status === "paused" ? "amber" : "green"}>{activeChallenge.status}</Pill>}</div>
              {activeChallenge ? <><div className="tracker-big"><div><b>{Math.min(activeDay, activeChallenge.targetDays)}</b><span>Current day</span></div><div><b>{activeChallenge.targetDays}</b><span>Target days</span></div><div><b>{challengeProgress}%</b><span>Completed</span></div></div><div className="progress-track large"><span style={{ width: challengeProgress + "%" }} /></div><div className="form-row"><button className="btn btn-secondary" onClick={toggleChallenge}>{activeChallenge.status === "active" ? <Pause size={15} /> : <Play size={15} />}{activeChallenge.status === "active" ? "Pause challenge" : "Resume challenge"}</button><button className="btn btn-outline" onClick={openCheckin}>Daily check-in</button></div><p className="muted-note">Started {formatDate(activeChallenge.startDate)} · {remainingDays(activeDay, activeChallenge.targetDays)} days remaining</p></> : <Empty icon={Target} title="Choose your starting point" body="Create a 30, 60, 90-day or custom challenge. You can change it as your goals evolve." action={<button className="btn btn-primary" onClick={() => setModal("challenge")}>Create challenge</button>} />}
            </Card>
            <Card><div className="card-heading"><div><div className="eyebrow">HABIT BUILDING</div><h3>Daily habits</h3></div><button className="btn btn-small btn-secondary" onClick={addHabit}><Plus size={14} /> Add habit</button></div><p className="muted-note">Build a routine that supports your wellbeing. Tap a habit to mark it done today.</p><div className="habit-list">{data.habits.map((habit) => {
              const count = Object.values(habit.completions).filter(Boolean).length;
              return <div key={habit.id} className="habit-row"><span className="habit-emoji">{habit.emoji}</span><div className="habit-row-copy"><b>{habit.name}</b><small>{count} completions recorded</small></div><button className={cn("check-circle", habit.completions[today] && "checked")} onClick={() => toggleHabit(habit)} aria-label={"Toggle " + habit.name}><Check size={14} /></button></div>;
            })}</div></Card>
          </div>
          <Card><div className="card-heading"><div><div className="eyebrow">YOUR HISTORY</div><h3>Challenge history</h3></div></div>{data.challenges.length ? <div className="history-list">{[...data.challenges].reverse().map((challenge) => <div className="history-row" key={challenge.id}><span className="history-symbol"><Target size={17} /></span><div><b>{challenge.kind} · {challenge.targetDays} days</b><small>{formatDate(challenge.startDate)} · {challenge.goalMode === "awareness" ? "Awareness" : challenge.goalMode}</small></div><Pill tone={challenge.status === "completed" ? "green" : challenge.status === "paused" ? "amber" : "blue"}>{challenge.status}</Pill></div>)}</div> : <p className="muted-note">Your completed and previous challenges will appear here.</p>}</Card>
          <Card><div className="card-heading"><div><div className="eyebrow">URGE TOOLKIT</div><h3>When a moment feels difficult</h3></div><button className="btn btn-primary btn-small" onClick={() => { setUrgeStep("menu"); setModal("urge"); }}>Open toolkit <ArrowRight size={14} /></button></div><div className="toolkit-cards"><div><span className="tool-icon t-purple"><Clock3 /></span><b>10-minute pause</b><small>Give yourself a little space before deciding.</small></div><div><span className="tool-icon t-blue"><Wind /></span><b>Breathing guide</b><small>Follow a calm 4–2–6 breathing rhythm.</small></div><div><span className="tool-icon t-green"><Compass /></span><b>Change your setting</b><small>Move to a shared space or another activity.</small></div></div></Card>
        </div>}

        {section === "Journal" && <div className="page-stack">
          <SectionTitle eyebrow="A SPACE FOR YOUR THOUGHTS" title="Personal journal" subtitle="Reflect with honesty. Your entries are private to your account or this device." action={<button className="btn btn-primary" onClick={openNewJournal}><Plus size={16} /> New entry</button>} />
          <Card className="journal-toolbar"><div className="searchbox"><Search size={17} /><input value={journalQuery} onChange={(event) => setJournalQuery(event.target.value)} placeholder="Search your reflections..." /></div><select value={journalFilter} onChange={(event) => setJournalFilter(event.target.value)}><option>All</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></Card>
          {journalMatches.length ? <div className="journal-grid">{journalMatches.map((entry) => <Card className="journal-card" key={entry.id}><div className="journal-card-top"><Pill tone="purple">{entry.category}</Pill><span>{formatDate(entry.createdAt.slice(0, 10))}</span></div><h3>{entry.title || "Untitled reflection"}</h3><p>{entry.content}</p><div className="tag-row">{entry.moods.slice(0, 3).map((mood) => <Pill key={mood} tone="gray">{mood}</Pill>)}</div><div className="journal-actions"><button className="text-button" onClick={() => openEditJournal(entry)}>Edit entry <ChevronRight size={14} /></button><button className="icon-button danger-quiet" onClick={() => deleteJournal(entry.id)} aria-label="Delete entry"><Trash2 size={16} /></button></div></Card>)}</div> : <Card><Empty icon={BookOpen} title={journalQuery || journalFilter !== "All" ? "No entries match your search" : "Your journal begins with one thought"} body={journalQuery || journalFilter !== "All" ? "Try another search or category." : "Writing can help you notice feelings, triggers and small wins. Start with whatever is on your mind."} action={<button className="btn btn-primary" onClick={openNewJournal}>Write your first entry</button>} /></Card>}
        </div>}

        {section === "Insights" && <div className="page-stack">
          <SectionTitle eyebrow="NOTICE. UNDERSTAND. ADJUST." title="Your insights" subtitle="Charts are calculated from your saved check-ins. Missing days are left blank, not filled with sample data." action={<select className="range-select" value={insightRange} onChange={(event) => setInsightRange(Number(event.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select>} />
          <div className="stats-grid insight-stats"><Card className="stat-card"><span className="stat-icon lavender"><Activity size={18} /></span><span className="stat-label">CHECK-INS IN PERIOD</span><strong>{chartLogs.length}</strong><span className="stat-hint">Of {insightRange} calendar days</span></Card><Card className="stat-card"><span className="stat-icon peach"><Zap size={18} /></span><span className="stat-label">AVERAGE URGE</span><strong>{chartLogs.length ? (chartLogs.reduce((sum, item) => sum + (item.log?.urgeIntensity || 0), 0) / chartLogs.length).toFixed(1) : "—"}<small>/10</small></strong><span className="stat-hint">Across recorded check-ins</span></Card><Card className="stat-card"><span className="stat-icon mint"><Heart size={18} /></span><span className="stat-label">EXERCISE DAYS</span><strong>{chartLogs.filter((item) => item.log?.exerciseCompleted).length}</strong><span className="stat-hint">Self-reported</span></Card><Card className="stat-card"><span className="stat-icon sky"><BookOpen size={18} /></span><span className="stat-label">REFLECTIONS</span><strong>{data.journalEntries.length}</strong><span className="stat-hint">Journal entries saved</span></Card></div>
          <div className="content-grid two-col">
            <Card><div className="card-heading"><div><div className="eyebrow">URGE INTENSITY</div><h3>Daily urge pattern</h3></div><Pill tone="purple">0–10 scale</Pill></div>{chartLogs.length ? <div className="bar-chart">{lastNDates(Math.min(insightRange, 14), today).map((key) => { const log = data.dailyLogs[key]; return <div className="bar-column" key={key}><div className="bar-value">{log ? log.urgeIntensity : ""}</div><div className="bar-rail"><span className={cn("bar-fill", log && log.urgeIntensity >= 7 && "bar-high")} style={{ height: log ? (log.urgeIntensity / 10 * 100) + "%" : "0%" }} /></div><small>{parseInt(key.slice(-2), 10)}</small></div>; })}</div> : <Empty icon={BarChart3} title="Your chart will grow with your check-ins" body="Complete a daily check-in to see your recorded urge intensity here." />}</Card>
            <Card><div className="card-heading"><div><div className="eyebrow">WHAT SHOWS UP</div><h3>Common triggers</h3></div></div>{triggerCounts.length ? <div className="rank-list">{triggerCounts.slice(0, 6).map(([trigger, count], index) => <div className="rank-row" key={trigger}><span>{index + 1}</span><b>{trigger}</b><div className="rank-track"><i style={{ width: (count / triggerCounts[0][1] * 100) + "%" }} /></div><small>{count}</small></div>)}</div> : <Empty icon={Zap} title="No trigger patterns yet" body="Add triggers during check-ins to understand which situations appear in your own records." />}</Card>
            <Card><div className="card-heading"><div><div className="eyebrow">EMOTIONAL AWARENESS</div><h3>Mood distribution</h3></div></div>{chartLogs.length ? <div className="mood-cloud">{Object.entries(chartLogs.flatMap((item) => item.log?.moods || []).reduce<Record<string, number>>((acc, mood) => { acc[mood] = (acc[mood] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]).map(([mood, count]) => <div className="mood-chip" key={mood}><span>{mood}</span><b>{count}</b></div>)}</div> : <Empty icon={Heart} title="Your mood patterns will appear here" body="Choose one or more moods in your daily check-in." />}</Card>
            <Card><div className="card-heading"><div><div className="eyebrow">ROUTINE & REST</div><h3>Sleep and movement</h3></div></div>{chartLogs.length ? <div className="routine-metrics"><div><Moon size={17} /><span>Average sleep</span><b>{(chartLogs.reduce((sum, item) => sum + (item.log?.sleepHours || 0), 0) / chartLogs.length).toFixed(1)} hrs</b></div><div><Activity size={17} /><span>Exercise days</span><b>{chartLogs.filter((item) => item.log?.exerciseCompleted).length}</b></div><div><Target size={17} /><span>Urges managed</span><b>{chartLogs.filter((item) => item.log?.urgeManaged).length}</b></div></div> : <Empty icon={Activity} title="Routine insights start with check-ins" body="Record sleep, exercise and urge management to see your own trends." />}</Card>
          </div>
          <Card className="ai-card"><div className="ai-glow"><Sparkles size={22} /></div><div className="ai-copy"><div className="eyebrow">PERSONAL GUIDANCE · OPTIONAL</div><h3>Reflect with your AI companion</h3><p>Get a gentle summary of recent patterns in your structured check-ins. Journal text is not sent with this request.</p></div><button className="btn btn-primary" onClick={generateAI} disabled={aiBusy}>{aiBusy ? <><span className="spinner" /> Thinking</> : <><Sparkles size={15} /> Generate insight</>}</button>{aiResult && <div className="ai-result"><b>Your reflection</b><p>{aiResult}</p></div>}</Card>
          <Card><div className="card-heading"><div><div className="eyebrow">REPORTED EXPERIENCES</div><h3>Relapse reflection history</h3></div><Pill tone="gray">{data.relapseEntries.length} reports</Pill></div>{data.relapseEntries.length ? <div className="history-list">{data.relapseEntries.map((entry) => <div className="history-row" key={entry.id}><span className="history-symbol warm"><RefreshCw size={16} /></span><div><b>{entry.behaviour === "both" ? "Pornography + masturbation" : entry.behaviour}</b><small>{formatDate(entry.date.slice(0, 10))} · {entry.trigger || "Trigger not specified"} · {entry.emotion || "Emotion not specified"}</small></div><Pill tone="amber">Reflection saved</Pill></div>)}</div> : <p className="muted-note">No reported experiences. There is nothing you need to report to use this app.</p>}</Card>
        </div>}

        {section === "Profile" && <div className="page-stack">
          <SectionTitle eyebrow="YOUR SPACE, YOUR CHOICES" title="Profile & settings" subtitle="Manage your preferences, privacy and account." />
          <div className="content-grid two-col">
            <Card><div className="profile-head"><span className="profile-avatar">{name.slice(0, 1).toUpperCase()}</span><div><h3>{name}</h3><p>{user?.email || "Local-only personal space"}</p><Pill tone={user ? "green" : "blue"}>{user ? "Firebase account" : "Guest mode"}</Pill></div></div><label className="field-label">Your name<input value={data.preferences.name} onChange={(event) => updateData((current) => ({ ...current, preferences: { ...current.preferences, name: event.target.value } }))} placeholder="How should we greet you?" /></label><div className="setting-row"><div><b>Account sync</b><small>{firebaseConfigured ? user ? "Your private data syncs to your account." : "Sign in to enable cloud sync." : "Firebase is not configured. This app is saving data on this device."}</small></div>{user ? <button className="btn btn-secondary btn-small" onClick={signOutUser}><LogOut size={14} /> Sign out</button> : <button className="btn btn-primary btn-small" onClick={() => setModal("auth")} disabled={!firebaseConfigured}><LogIn size={14} /> Sign in</button>}</div><div className="setting-row"><div><b>Data storage</b><small>{user ? "Local copy + private Firestore document" : "Browser localStorage on this device"}</small></div><Pill tone="green"><ShieldCheck size={12} /> Private</Pill></div></Card>
            <Card><div className="card-heading"><div><div className="eyebrow">AI PERSONAL GUIDANCE</div><h3>Your AI preferences</h3></div><span className="settings-icon"><Brain size={18} /></span></div><div className="setting-row"><div><b>Enable AI guidance</b><small>Allow on-demand reflections based on your check-in patterns.</small></div><Toggle checked={data.preferences.aiEnabled} onChange={(value) => updateData((current) => ({ ...current, preferences: { ...current.preferences, aiEnabled: value } }))} /></div><div className="setting-row"><div><b>Consent to process check-in data</b><small>When you request an insight, recent structured logs are sent to the configured AI backend. Journal text is excluded.</small></div><Toggle checked={data.preferences.aiConsent} onChange={(value) => updateData((current) => ({ ...current, preferences: { ...current.preferences, aiConsent: value } }))} /></div><p className="privacy-note"><ShieldCheck size={15} /> AI is off by default. You can disable it or withdraw consent at any time.</p></Card>
            <Card><div className="card-heading"><div><div className="eyebrow">GENTLE REMINDERS</div><h3>Notification preferences</h3></div><span className="settings-icon"><Clock3 size={18} /></span></div><div className="setting-row"><div><b>Daily reminders</b><small>Reminder settings are saved locally. Delivery requires notification service setup.</small></div><Toggle checked={data.preferences.notificationsEnabled} onChange={(value) => updateData((current) => ({ ...current, preferences: { ...current.preferences, notificationsEnabled: value } }))} /></div><div className="form-grid"><label className="field-label">Morning reminder<input type="time" value={data.preferences.morningReminder} onChange={(event) => updateData((current) => ({ ...current, preferences: { ...current.preferences, morningReminder: event.target.value } }))} /></label><label className="field-label">Evening reminder<input type="time" value={data.preferences.eveningReminder} onChange={(event) => updateData((current) => ({ ...current, preferences: { ...current.preferences, eveningReminder: event.target.value } }))} /></label></div><p className="muted-note">We never use shame-based notifications. Actual delivery is not active in this starter.</p></Card>
            <Card><div className="card-heading"><div><div className="eyebrow">YOUR INFORMATION</div><h3>Privacy & data</h3></div><span className="settings-icon"><ShieldCheck size={18} /></span></div><p className="muted-note">Your journal and behaviour records are sensitive. Export a copy before clearing this device. Cloud data is protected by the included owner-scoped Firestore rules when those rules are deployed.</p><div className="profile-actions"><button className="btn btn-secondary" onClick={() => exportData(data)}><Download size={15} /> Export my data</button><button className="btn btn-danger-outline" onClick={() => { if (window.confirm("Delete all NOFAP data saved on this device? Export first if you need a copy.")) { clearLocalData(); setData(createInitialData()); setAiResult(""); showToast("Local data cleared."); } }}><Trash2 size={15} /> Delete local data</button></div></Card>
          </div>
          <Card className="learning-card"><div className="card-heading"><div><div className="eyebrow">UNDERSTAND YOUR BRAIN</div><h3>Scientific learning centre</h3></div><Pill tone="purple">10 topics</Pill></div><p className="muted-note">Evidence-aware learning. This app is not a diagnostic or treatment tool.</p><div className="learning-list">{learning.map((article) => <button key={article.title} onClick={() => setSelectedArticle(article)}><span className="learning-icon"><BookOpen size={16} /></span><span><b>{article.title}</b><small>{article.group} · {article.read} read</small></span><ChevronRight size={16} /></button>)}</div><div className="source-note"><b>Reference note:</b> Compulsive sexual behaviour disorder is described in WHO ICD-11 (6C72). <a href="https://icd.who.int/browse/2026-01/mms/en#1630268048" target="_blank" rel="noreferrer">WHO ICD-11 browser <ArrowRight size={12} /></a>. Articles are educational summaries, not personal medical advice.</div></Card>
        </div>}
      </div>
      <footer className="footer"><span>NOFAP · RECLAIM YOUR CONTROL</span><span>Progress, not perfection.</span></footer>
    </main>

    <nav className="mobile-nav">{navItems.map(({ id, icon: Icon }) => <button key={id} onClick={() => setSection(id)} className={cn(section === id && "mobile-active")}><Icon size={19} /><span>{id}</span></button>)}</nav>

    {modal === "checkin" && <ModalShell title="Daily check-in" subtitle={formatDate(today, { weekday: "long", month: "long", day: "numeric" })} onClose={() => setModal(null)} wide>
      <form className="modal-body" onSubmit={saveCheckin}>
        <div className="form-section"><h3>Today's experience</h3><p>Answer honestly. Your check-in is for understanding, not judgement.</p><div className="question-grid"><label className="question-card"><span>Did you watch pornography today?</span><Toggle checked={checkForm.pornographyUsed} onChange={(value) => setCheckForm((form) => ({ ...form, pornographyUsed: value }))} /></label><label className="question-card"><span>Did you masturbate today?</span><Toggle checked={checkForm.masturbationReported} onChange={(value) => setCheckForm((form) => ({ ...form, masturbationReported: value }))} /></label></div><div className="field-label range-label"><span>How strong were your urges?</span><b>{checkForm.urgeIntensity}/10 · {checkForm.urgeIntensity <= 3 ? "Low" : checkForm.urgeIntensity <= 6 ? "Moderate" : checkForm.urgeIntensity <= 8 ? "Strong" : "Very strong"}</b></div><input className="range-input" type="range" min="0" max="10" value={checkForm.urgeIntensity} onChange={(event) => setCheckForm((form) => ({ ...form, urgeIntensity: Number(event.target.value) }))} /><div className="range-ends"><span>0 · None</span><span>10 · Very strong</span></div></div>
        <div className="form-section"><h3>How did you feel?</h3><p>Select any words that fit today.</p><div className="choice-grid">{moods.map((mood) => <button type="button" key={mood} className={cn("choice-chip", checkForm.moods.includes(mood) && "choice-selected")} onClick={() => setCheckForm((form) => ({ ...form, moods: form.moods.includes(mood) ? form.moods.filter((item) => item !== mood) : [...form.moods, mood] }))}>{mood}</button>)}</div></div>
        <div className="form-section"><h3>What may have influenced today?</h3><p>Choose any triggers you noticed.</p><div className="choice-grid">{triggers.map((trigger) => <button type="button" key={trigger} className={cn("choice-chip", checkForm.triggers.includes(trigger) && "choice-selected")} onClick={() => setCheckForm((form) => ({ ...form, triggers: form.triggers.includes(trigger) ? form.triggers.filter((item) => item !== trigger) : [...form.triggers, trigger] }))}>{trigger}</button>)}</div></div>
        <div className="form-section"><h3>Daily wellbeing</h3><div className="question-grid"><label className="question-card"><span>Did you manage an urge in a way that felt right?</span><Toggle checked={checkForm.urgeManaged} onChange={(value) => setCheckForm((form) => ({ ...form, urgeManaged: value }))} /></label><label className="question-card"><span>Did you exercise today?</span><Toggle checked={checkForm.exerciseCompleted} onChange={(value) => setCheckForm((form) => ({ ...form, exerciseCompleted: value }))} /></label></div><div className="form-grid"><label className="field-label">Hours of sleep<input type="number" min="0" max="24" step=".5" value={checkForm.sleepHours} onChange={(event) => setCheckForm((form) => ({ ...form, sleepHours: Number(event.target.value) }))} /></label><label className="field-label">Productivity (1–5)<select value={checkForm.productivity} onChange={(event) => setCheckForm((form) => ({ ...form, productivity: Number(event.target.value) }))}><option value="1">1 · Very low</option><option value="2">2 · Low</option><option value="3">3 · Steady</option><option value="4">4 · Good</option><option value="5">5 · Very good</option></select></label></div></div>
        <div className="form-section"><h3>A little reflection</h3><label className="field-label">What did you experience today?<textarea rows={2} value={checkForm.reflection} onChange={(event) => setCheckForm((form) => ({ ...form, reflection: event.target.value }))} placeholder="Anything you want to remember..." /></label><label className="field-label">What did you learn?<textarea rows={2} value={checkForm.learned} onChange={(event) => setCheckForm((form) => ({ ...form, learned: event.target.value }))} placeholder="A pattern, a helpful choice, or something new..." /></label><label className="field-label">What would you like to try tomorrow?<textarea rows={2} value={checkForm.tomorrow} onChange={(event) => setCheckForm((form) => ({ ...form, tomorrow: event.target.value }))} placeholder="Keep it small and realistic..." /></label></div>
        <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="btn btn-primary"><Check size={15} /> Save check-in</button></div>
      </form>
    </ModalShell>}

    {modal === "challenge" && <ModalShell title="Create a challenge" subtitle="Choose a goal that feels meaningful and realistic for you." onClose={() => setModal(null)}>
      <form className="modal-body" onSubmit={saveChallenge}><div className="form-section"><h3>Choose your starting level</h3><div className="challenge-options">{(["Beginner", "Intermediate", "Advanced", "Pro"] as ChallengeKind[]).map((kind) => <button type="button" className={cn("challenge-option", challengeForm.kind === kind && "option-selected")} key={kind} onClick={() => setChallengeForm((form) => ({ ...form, kind, targetDays: kind === "Beginner" ? 30 : kind === "Intermediate" ? 60 : 90 }))}><span className="option-symbol">{kind === "Beginner" ? "🌱" : kind === "Intermediate" ? "🌿" : kind === "Advanced" ? "🌳" : "✨"}</span><b>{kind}</b><small>{kind === "Pro" ? "Custom duration" : (kind === "Beginner" ? "30" : kind === "Intermediate" ? "60" : "90") + " days"}</small></button>)}</div></div><div className="form-section"><h3>Your focus</h3><div className="radio-stack">{([{ value: "pornography", label: "Reduce pornography use" }, { value: "masturbation", label: "Manage masturbation habits" }, { value: "both", label: "Track both behaviours" }, { value: "awareness", label: "Build awareness without an abstinence target" }] as { value: GoalMode; label: string }[]).map((item) => <label key={item.value} className="radio-row"><input type="radio" name="goal" checked={challengeForm.goalMode === item.value} onChange={() => setChallengeForm((form) => ({ ...form, goalMode: item.value }))} /><span>{item.label}</span></label>)}</div></div><div className="form-grid"><label className="field-label">Duration (days)<input type="number" min="1" max="3650" value={challengeForm.targetDays} onChange={(event) => setChallengeForm((form) => ({ ...form, targetDays: Math.max(1, Math.min(3650, Number(event.target.value))) }))} /></label><label className="field-label">Start date<input type="date" value={challengeForm.startDate} onChange={(event) => setChallengeForm((form) => ({ ...form, startDate: event.target.value }))} /></label></div><p className="privacy-note"><Heart size={15} /> You can pause, adjust or restart. A reported lapse never erases your learning history.</p><div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" type="submit">Start challenge <ArrowRight size={15} /></button></div></form>
    </ModalShell>}

    {modal === "journal" && <ModalShell title={editingJournal ? "Edit journal entry" : "New journal entry"} subtitle="This is your space. Write as much or as little as you like." onClose={() => setModal(null)}>
      <form className="modal-body" onSubmit={saveJournal}><label className="field-label">Title<input value={journalForm.title} onChange={(event) => setJournalForm((form) => ({ ...form, title: event.target.value }))} placeholder="Give this entry a title" /></label><label className="field-label">Category<select value={journalForm.category} onChange={(event) => setJournalForm((form) => ({ ...form, category: event.target.value }))}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="field-label">Your reflection<textarea rows={7} required value={journalForm.content} onChange={(event) => setJournalForm((form) => ({ ...form, content: event.target.value }))} placeholder="What is on your mind today?" /></label><div className="form-section"><h3>Mood labels</h3><div className="choice-grid">{moods.map((mood) => <button type="button" className={cn("choice-chip", journalForm.moods.includes(mood) && "choice-selected")} key={mood} onClick={() => setJournalForm((form) => ({ ...form, moods: form.moods.includes(mood) ? form.moods.filter((item) => item !== mood) : [...form.moods, mood] }))}>{mood}</button>)}</div></div><div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="btn btn-primary"><Check size={15} /> Save entry</button></div></form>
    </ModalShell>}

    {modal === "relapse" && <ModalShell title="Reflect on an experience" subtitle="This is information, not a failure. You are still welcome here." onClose={() => setModal(null)}>
      <form className="modal-body" onSubmit={saveRelapse}><label className="field-label">What behaviour do you want to record?<select value={relapseForm.behaviour} onChange={(event) => setRelapseForm((form) => ({ ...form, behaviour: event.target.value as RelapseEntry["behaviour"] }))}><option value="pornography">Pornography use</option><option value="masturbation">Masturbation</option><option value="both">Both</option></select></label><label className="field-label">What may have triggered it?<input value={relapseForm.trigger} onChange={(event) => setRelapseForm((form) => ({ ...form, trigger: event.target.value }))} placeholder="For example, boredom, stress, late-night scrolling" /></label><label className="field-label">What emotion were you experiencing?<input value={relapseForm.emotion} onChange={(event) => setRelapseForm((form) => ({ ...form, emotion: event.target.value }))} placeholder="Anxious, lonely, bored..." /></label><label className="radio-row"><input type="checkbox" checked={relapseForm.planned} onChange={(event) => setRelapseForm((form) => ({ ...form, planned: event.target.checked }))} /><span>It was planned rather than impulsive</span></label><label className="field-label">What could help next time?<textarea rows={4} value={relapseForm.reflection} onChange={(event) => setRelapseForm((form) => ({ ...form, reflection: event.target.value }))} placeholder="An alternative, boundary or support you could try..." /></label><div className="privacy-note"><Heart size={15} /> Wet dreams and involuntary nocturnal emissions are not relapses and are not recorded here.</div><div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" type="submit">Save reflection <ArrowRight size={15} /></button></div></form>
    </ModalShell>}

    {modal === "urge" && <ModalShell title="Control your urges" subtitle="An urge is a feeling, not an instruction. You can pause and choose your next action." onClose={() => setModal(null)} wide>
      {urgeStep === "menu" && <div className="modal-body"><div className="urge-grid"><button onClick={() => { setTimer(600); setUrgeStep("timer"); }}><span className="urge-tool-icon t-purple"><Clock3 /></span><b>10-minute delay</b><small>Wait, breathe and decide later.</small><ChevronRight /></button><button onClick={() => { setBreathPhase("Inhale"); setBreathSecond(4); setUrgeStep("breathing"); }}><span className="urge-tool-icon t-blue"><Wind /></span><b>Breathing exercise</b><small>Follow a comfortable 4–2–6 rhythm.</small><ChevronRight /></button><button onClick={() => setUrgeStep("surfing")}><span className="urge-tool-icon t-green"><WavesIcon /></span><b>Urge surfing</b><small>Observe the feeling without judging it.</small><ChevronRight /></button></div><div className="urge-reassurance"><Sparkles size={18} /><p>You do not need to solve everything right now. Try one small next step: stand up, change rooms, put your phone down or reach out to someone you trust.</p></div><div className="modal-actions"><button className="btn btn-secondary" onClick={() => setModal(null)}>Close toolkit</button></div></div>}
      {urgeStep === "timer" && <div className="modal-body center-tool"><div className="tool-large-icon t-purple"><Clock3 size={28} /></div><div className="eyebrow">A PAUSE FOR YOU</div><div className="timer-number">{String(Math.floor(timer / 60)).padStart(2, "0")}:{String(timer % 60).padStart(2, "0")}</div><p>Use these few minutes to move somewhere comfortable, breathe and let the urgency settle at its own pace.</p>{timer === 0 ? <Pill tone="green">Pause complete — choose what feels right next.</Pill> : <div className="timer-track"><span style={{ width: (timer / 600 * 100) + "%" }} /></div>}<div className="modal-actions"><button className="btn btn-secondary" onClick={() => setUrgeStep("menu")}>Back</button><button className="btn btn-primary" onClick={() => setTimer(600)}><RefreshCw size={15} /> Restart</button></div></div>}
      {urgeStep === "breathing" && <div className="modal-body center-tool"><div className={cn("breath-orb", breathPhase === "Inhale" && "breath-in", breathPhase === "Exhale" && "breath-out")}><Wind size={25} /><b>{breathPhase}</b><span>{breathSecond}</span></div><div className="eyebrow">BREATHE AT YOUR OWN PACE</div><h3>Inhale 4 · Hold 2 · Exhale 6</h3><p>Keep the breath comfortable. Skip the hold or return to normal breathing if you feel light-headed.</p><div className="modal-actions"><button className="btn btn-secondary" onClick={() => setUrgeStep("menu")}>Back to tools</button><button className="btn btn-primary" onClick={() => { setBreathPhase("Inhale"); setBreathSecond(4); }}>Restart cycle</button></div></div>}
      {urgeStep === "surfing" && <div className="modal-body"><div className="urge-reassurance"><WavesIcon size={20} /><p>Urge surfing means noticing an urge as a temporary body-and-mind experience, rather than fighting it or automatically acting on it.</p></div><ol className="surf-steps"><li><b>Notice</b><span>Where do you feel the urge in your body? Describe it neutrally.</span></li><li><b>Name</b><span>Try: “I notice an urge is here.” You do not have to obey it.</span></li><li><b>Breathe</b><span>Let your breath be natural. Observe whether the intensity changes.</span></li><li><b>Choose</b><span>Pick one helpful action that fits your values and current needs.</span></li></ol><div className="modal-actions"><button className="btn btn-secondary" onClick={() => setUrgeStep("menu")}>Back to tools</button><button className="btn btn-primary" onClick={() => setModal(null)}>I'm ready</button></div></div>}
    </ModalShell>}

    {modal === "auth" && <ModalShell title="Your private account" subtitle="Sign in to sync your personal data across devices." onClose={() => setModal(null)}><form className="modal-body" onSubmit={submitAuth}><label className="field-label">Email<input name="email" type="email" required autoComplete="email" placeholder="you@example.com" /></label><label className="field-label">Password<input name="password" type="password" minLength={6} required autoComplete="current-password" placeholder="At least 6 characters" /></label><div className="radio-stack"><label className="radio-row"><input type="radio" name="mode" value="login" defaultChecked /><span>Sign in to existing account</span></label><label className="radio-row"><input type="radio" name="mode" value="register" /><span>Create a new account</span></label></div><p className="muted-note">Firebase Email/Password Authentication must be enabled in your project. Your password is handled by Firebase Authentication and is never stored in this app's database.</p><div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={authBusy}>{authBusy ? "Please wait..." : "Continue"} <ArrowRight size={15} /></button></div></form></ModalShell>}

    {selectedArticle && <ModalShell title={selectedArticle.title} subtitle={selectedArticle.group + " · " + selectedArticle.read + " read"} onClose={() => setSelectedArticle(null)}><div className="modal-body article-body"><Pill tone="purple">Understand your brain</Pill><p>{selectedArticle.body}</p><div className="article-takeaway"><Lightbulb size={18} /><div><b>Takeaway</b><p>{selectedArticle.takeaway}</p></div></div><div className="source-note">For clinical classification, see the <a href="https://icd.who.int/browse/2026-01/mms/en#1630268048" target="_blank" rel="noreferrer">WHO ICD-11 browser <ArrowRight size={12} /></a>. Educational content is not a substitute for professional care.</div><div className="modal-actions"><button className="btn btn-primary" onClick={() => setSelectedArticle(null)}>Done</button></div></div></ModalShell>}

    {toast && <div className="toast"><CheckCircle2 size={17} />{toast}</div>}
  </div>;
}

function WavesIcon() { return <Activity size={20} />; }

export default App;
