export type SmartSetPresetKind = "repeat" | "progress" | "backoff";

export interface SmartSetPreset {
  kind: SmartSetPresetKind;
  weightKg: number | null;
  reps: number;
}

interface BuildSmartSetPresetsInput {
  baseline: { weightKg: number | null; reps: number | null } | null | undefined;
  targetRepsMin: number;
  targetRepsMax: number;
  weightStepKg: number;
  allowBodyweight?: boolean;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundToStep(value: number, step: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const safeStep = Number.isFinite(step) && step > 0 ? step : 2.5;
  return Math.round(value / safeStep) * safeStep;
}

function presetKey(preset: SmartSetPreset) {
  return `${preset.weightKg ?? "bodyweight"}:${preset.reps}`;
}

export function buildSmartSetPresets({ baseline, targetRepsMin, targetRepsMax, weightStepKg, allowBodyweight = false }: BuildSmartSetPresetsInput): SmartSetPreset[] {
  if (!baseline || baseline.reps === null || baseline.reps < 1) return [];
  if (baseline.weightKg === null && !allowBodyweight) return [];

  const min = Math.max(1, Math.min(targetRepsMin, targetRepsMax));
  const max = Math.max(min, targetRepsMax);
  const reps = clamp(Math.round(baseline.reps), 1, 1000);
  const weightKg = baseline.weightKg === null ? null : Math.max(0, baseline.weightKg);
  const stepKg = Number.isFinite(weightStepKg) && weightStepKg > 0 ? weightStepKg : 2.5;

  const repeat: SmartSetPreset = { kind: "repeat", weightKg, reps };
  const progress: SmartSetPreset = reps >= max
    ? { kind: "progress", weightKg: weightKg === null ? null : roundToStep(weightKg + stepKg, stepKg), reps: min }
    : { kind: "progress", weightKg, reps: Math.min(max, reps + 1) };
  const backoffWeight = weightKg === null ? null : roundToStep(weightKg * 0.9, stepKg);
  const backoff: SmartSetPreset = {
    kind: "backoff",
    weightKg: backoffWeight,
    reps: Math.min(max, Math.max(min, reps + 2)),
  };

  const unique = new Map<string, SmartSetPreset>();
  for (const preset of [repeat, progress, backoff]) {
    const key = presetKey(preset);
    if (!unique.has(key)) unique.set(key, preset);
  }
  return [...unique.values()].slice(0, 3);
}
