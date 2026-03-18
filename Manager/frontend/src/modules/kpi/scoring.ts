export type PerformanceRating = "needs_support" | "on_track" | "excelling";

export type KPIQuestionConfig = {
  key: string;
  label: string;
  type: "rating" | "slider";
  maxValue: number;
  weight: number;
  ratingToValue?: Record<PerformanceRating, number>;
};

export const DEFAULT_QUESTIONS: KPIQuestionConfig[] = [
  {
    key: "performance_rating",
    label: "How is this employee performing?",
    type: "rating",
    maxValue: 4,
    weight: 1.5,
    ratingToValue: {
      needs_support: 0,
      on_track: 2,
      excelling: 4,
    },
  },
  { key: "communication", label: "Communication Skills", type: "slider", maxValue: 5, weight: 1.5 },
  { key: "reliability", label: "Task Completion & Reliability", type: "slider", maxValue: 5, weight: 1.5 },
  { key: "quality", label: "Quality of Work", type: "slider", maxValue: 5, weight: 1.5 },
  { key: "initiative", label: "Proactiveness & Initiative", type: "slider", maxValue: 3, weight: 1.5 },
  { key: "collaboration", label: "Collaboration & Teamwork", type: "slider", maxValue: 3, weight: 1.5 },
];

export type KPIAnswerValues = {
  performance_rating: PerformanceRating | null;
  communication: number;
  reliability: number;
  quality: number;
  initiative: number;
  collaboration: number;
  additional_feedback?: string;
  manager_override_points?: number | null;
};

export type KPIComputed = {
  rawPoints: number;
  roundedPoints: number;
  cappedAutoPoints: number;
  finalPoints: number;
  perQuestion: Array<{ key: string; maxValue: number; weight: number; value: number; computedPoints: number }>;
};

export function computeKpiScore(
  answers: KPIAnswerValues,
  cfg: {
    questions?: KPIQuestionConfig[];
    maxAutoPoints?: number;
    maxOverridePoints?: number;
    maxFinalPoints?: number;
  } = {}
): KPIComputed {
  const questions = cfg.questions || DEFAULT_QUESTIONS;
  const maxAutoPoints = cfg.maxAutoPoints ?? 25;
  const maxOverridePoints = cfg.maxOverridePoints ?? 5;
  const maxFinalPoints = cfg.maxFinalPoints ?? 30;

  const scoredQuestions = questions.filter((q) => q.key !== "additional_feedback");

  const perQuestion = scoredQuestions.map((q) => {
    let value = 0;
    if (q.type === "rating") {
      const r = answers.performance_rating;
      value = r && q.ratingToValue ? q.ratingToValue[r] ?? 0 : 0;
    } else {
      value = Number((answers as any)[q.key] ?? 0);
    }

    const safeVal = Number.isFinite(value) ? value : 0;
    const clamped = Math.max(0, Math.min(q.maxValue, safeVal));
    const computedPoints = clamped;
    return { key: q.key, maxValue: q.maxValue, weight: q.weight, value: clamped, computedPoints };
  });

  const rawPoints = perQuestion.reduce((sum, x) => sum + (Number.isFinite(x.computedPoints) ? x.computedPoints : 0), 0);
  const roundedPoints = Math.round(rawPoints);
  const cappedAutoPoints = Math.min(maxAutoPoints, Math.max(0, roundedPoints));

  const override = answers.manager_override_points;
  const bonusPoints =
    override === null || override === undefined
      ? 0
      : Math.min(maxOverridePoints, Math.max(0, Math.round(Number(override) || 0)));
  const finalPoints = Math.min(maxFinalPoints, Math.max(0, cappedAutoPoints + bonusPoints));

  return {
    rawPoints,
    roundedPoints,
    cappedAutoPoints,
    finalPoints,
    perQuestion,
  };
}
