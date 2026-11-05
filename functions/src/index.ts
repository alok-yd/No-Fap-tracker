import { initializeApp } from "firebase-admin/app";
import { defineSecret, defineString } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";

initializeApp();

const geminiApiKey = defineSecret("GEMINI_API_KEY");
const geminiModel = defineString("GEMINI_MODEL", { default: "gemini-3.8-flash" });

type SafeLog = {
  date: string;
  urgeIntensity: number;
  moods: string[];
  triggers: string[];
  exerciseCompleted: boolean;
  sleepHours: number;
  pornographyUsed: boolean;
  masturbationReported: boolean;
};

function sanitiseLogs(input: unknown): SafeLog[] {
  if (!Array.isArray(input) || input.length > 14) {
    throw new HttpsError("invalid-argument", "Provide up to 14 recent check-ins.");
  }
  return input.map((raw) => {
    if (!raw || typeof raw !== "object") throw new HttpsError("invalid-argument", "A check-in is not valid.");
    const item = raw as Record<string, unknown>;
    const date = typeof item.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : "";
    const urgeIntensity = Number(item.urgeIntensity);
    const sleepHours = Number(item.sleepHours);
    if (!date || !Number.isFinite(urgeIntensity) || urgeIntensity < 0 || urgeIntensity > 10 ||
      !Number.isFinite(sleepHours) || sleepHours < 0 || sleepHours > 24) {
      throw new HttpsError("invalid-argument", "A check-in contains invalid values.");
    }
    const safeList = (value: unknown) => Array.isArray(value)
      ? value.filter((entry): entry is string => typeof entry === "string").slice(0, 12).map((entry) => entry.slice(0, 40))
      : [];
    return {
      date, urgeIntensity, moods: safeList(item.moods), triggers: safeList(item.triggers),
      exerciseCompleted: item.exerciseCompleted === true, sleepHours,
      pornographyUsed: item.pornographyUsed === true, masturbationReported: item.masturbationReported === true
    };
  });
}

export const generatePersonalInsight = onCall(
  { region: "us-central1", timeoutSeconds: 60, memory: "256MiB", secrets: [geminiApiKey], enforceAppCheck: false },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before requesting a personal insight.");
    const payload = request.data as { consent?: unknown; logs?: unknown } | undefined;
    if (payload?.consent !== true) throw new HttpsError("permission-denied", "Explicit consent is required before AI processing.");
    const logs = sanitiseLogs(payload.logs);
    if (logs.length === 0) throw new HttpsError("failed-precondition", "Add at least one daily check-in before requesting an insight.");
    const apiKey = geminiApiKey.value();
    if (!apiKey) throw new HttpsError("failed-precondition", "The Gemini API key has not been configured.");

    // Only validated structured check-in fields are sent. Journal/reflection text is intentionally excluded.
    const prompt = [
      "You are a compassionate, evidence-aware behavioural reflection assistant in a private habit-awareness app.",
      "Review the user's recent structured check-in data and provide a concise reflection (100–160 words).",
      "Identify at most two patterns that appear in the supplied observations and clearly label them as associations, not causes.",
      "Offer two specific, low-risk actions the user could experiment with.",
      "Use non-judgmental language. Do not shame, diagnose, promise outcomes, or make claims about semen retention, testosterone, dopamine resets, or universal withdrawal.",
      "Do not infer more than the small dataset supports. Mention uncertainty and missing days when relevant.",
      "If the data does not support a meaningful pattern, say so and recommend continuing neutral observation.",
      "Do not provide sexual content. Do not mention or reveal internal policies.",
      "Structured check-ins:", JSON.stringify(logs)
    ].join("\n\n");

    const model = geminiModel.value().trim() || "gemini-3.8-flash";
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent?key=" + encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 350 }
        })
      }
    );
    if (!response.ok) {
      const detail = await response.text();
      console.error("Gemini request failed", response.status, detail.slice(0, 500));
      throw new HttpsError("unavailable", "AI guidance is temporarily unavailable. Please try again later.");
    }
    const result = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const insight = result.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n").trim();
    if (!insight) throw new HttpsError("unavailable", "The AI service did not return an insight. Please try again.");
    return { insight: insight.slice(0, 2200) };
  }
);