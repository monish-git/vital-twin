// constants/exercisePresets.ts
// Exercise presets mapped to BioGears GenericExercise Intensity (0.0–1.0)

export interface ExercisePreset {
  id: string;
  name: string;
  emoji: string;
  intensity: number;        // BioGears 0.0–1.0 scale
  defaultDurationMin: number;
  category: 'cardio' | 'strength' | 'flexibility' | 'sports' | 'daily';
  description?: string;
  // Estimated MET (Metabolic Equivalent) for display only
  met?: number;
}

export const EXERCISE_PRESETS: ExercisePreset[] = [
  // ── DAILY ACTIVITY ──────────────────────────────────────────
  {
    id: 'walk_slow',
    name: 'Walking (Slow)',
    emoji: '🚶',
    intensity: 0.10,
    defaultDurationMin: 30,
    category: 'daily',
    description: 'Leisurely stroll, < 3 km/h',
    met: 2.0,
  },
  {
    id: 'walk_brisk',
    name: 'Walking (Brisk)',
    emoji: '🚶‍♂️',
    intensity: 0.25,
    defaultDurationMin: 30,
    category: 'daily',
    description: 'Fast walk, ~5 km/h',
    met: 3.5,
  },
  {
    id: 'stair_climb',
    name: 'Stair Climbing',
    emoji: '🏃',
    intensity: 0.30,
    defaultDurationMin: 15,
    category: 'daily',
    description: 'Climbing stairs at moderate pace',
    met: 4.0,
  },
  {
    id: 'household',
    name: 'Household Work',
    emoji: '🏠',
    intensity: 0.12,
    defaultDurationMin: 45,
    category: 'daily',
    description: 'Cleaning, mopping, cooking',
    met: 2.5,
  },
  // ── CARDIO ────────────────────────────────────────────────
  {
    id: 'jog',
    name: 'Jogging',
    emoji: '🏃‍♂️',
    intensity: 0.45,
    defaultDurationMin: 30,
    category: 'cardio',
    description: 'Easy run, ~7–8 km/h',
    met: 7.0,
  },
  {
    id: 'run_moderate',
    name: 'Running (Moderate)',
    emoji: '🏃',
    intensity: 0.60,
    defaultDurationMin: 30,
    category: 'cardio',
    description: 'Steady run, ~10 km/h',
    met: 9.0,
  },
  {
    id: 'run_fast',
    name: 'Running (Fast)',
    emoji: '💨',
    intensity: 0.80,
    defaultDurationMin: 20,
    category: 'cardio',
    description: 'Hard run, ~12–14 km/h',
    met: 11.0,
  },
  {
    id: 'cycling_easy',
    name: 'Cycling (Easy)',
    emoji: '🚴',
    intensity: 0.28,
    defaultDurationMin: 45,
    category: 'cardio',
    description: 'Leisure cycling, flat road',
    met: 4.0,
  },
  {
    id: 'cycling_moderate',
    name: 'Cycling (Moderate)',
    emoji: '🚴‍♂️',
    intensity: 0.45,
    defaultDurationMin: 45,
    category: 'cardio',
    description: 'Steady cycling, 15–20 km/h',
    met: 6.5,
  },
  {
    id: 'cycling_intense',
    name: 'Cycling (Intense)',
    emoji: '🚵',
    intensity: 0.68,
    defaultDurationMin: 30,
    category: 'cardio',
    description: 'Fast cycling or hill climb, > 25 km/h',
    met: 10.0,
  },
  {
    id: 'swimming',
    name: 'Swimming',
    emoji: '🏊',
    intensity: 0.55,
    defaultDurationMin: 30,
    category: 'cardio',
    description: 'Freestyle laps, moderate effort',
    met: 6.0,
  },
  {
    id: 'hiit',
    name: 'HIIT',
    emoji: '⚡',
    intensity: 0.80,
    defaultDurationMin: 20,
    category: 'cardio',
    description: 'High-Intensity Interval Training',
    met: 10.0,
  },
  {
    id: 'skipping',
    name: 'Jump Rope',
    emoji: '🪃',
    intensity: 0.68,
    defaultDurationMin: 15,
    category: 'cardio',
    description: 'Skipping rope, moderate pace',
    met: 9.0,
  },
  // ── STRENGTH ──────────────────────────────────────────────
  {
    id: 'gym_light',
    name: 'Gym (Light)',
    emoji: '💪',
    intensity: 0.30,
    defaultDurationMin: 60,
    category: 'strength',
    description: 'Machine weights, low intensity',
    met: 3.5,
  },
  {
    id: 'gym_moderate',
    name: 'Gym (Moderate)',
    emoji: '🏋️',
    intensity: 0.50,
    defaultDurationMin: 60,
    category: 'strength',
    description: 'Free weights, compound movements',
    met: 6.0,
  },
  {
    id: 'gym_heavy',
    name: 'Gym (Heavy)',
    emoji: '🏋️‍♂️',
    intensity: 0.68,
    defaultDurationMin: 60,
    category: 'strength',
    description: 'Heavy barbell, powerlifting style',
    met: 8.0,
  },
  {
    id: 'pushups',
    name: 'Push-ups / Bodyweight',
    emoji: '⬆️',
    intensity: 0.35,
    defaultDurationMin: 20,
    category: 'strength',
    description: 'Push-ups, squats, pull-ups circuit',
    met: 4.5,
  },
  // ── FLEXIBILITY / MIND-BODY ─────────────────────────────
  {
    id: 'yoga',
    name: 'Yoga',
    emoji: '🧘',
    intensity: 0.10,
    defaultDurationMin: 45,
    category: 'flexibility',
    description: 'Hatha or Vinyasa yoga',
    met: 2.5,
  },
  {
    id: 'yoga_power',
    name: 'Power Yoga',
    emoji: '🧘‍♂️',
    intensity: 0.25,
    defaultDurationMin: 45,
    category: 'flexibility',
    description: 'Intense yoga with flow sequences',
    met: 4.0,
  },
  {
    id: 'meditation',
    name: 'Meditation',
    emoji: '🙏',
    intensity: 0.02,
    defaultDurationMin: 20,
    category: 'flexibility',
    description: 'Seated mindfulness, minimal physical effect',
    met: 1.0,
  },
  {
    id: 'stretching',
    name: 'Stretching',
    emoji: '🤸',
    intensity: 0.08,
    defaultDurationMin: 15,
    category: 'flexibility',
    description: 'Full body stretch routine',
    met: 2.0,
  },
  // ── SPORTS ────────────────────────────────────────────────
  {
    id: 'cricket',
    name: 'Cricket (Batting/Fielding)',
    emoji: '🏏',
    intensity: 0.35,
    defaultDurationMin: 90,
    category: 'sports',
    description: 'Cricket match or practice session',
    met: 4.8,
  },
  {
    id: 'football',
    name: 'Football / Soccer',
    emoji: '⚽',
    intensity: 0.60,
    defaultDurationMin: 60,
    category: 'sports',
    description: 'Football match, varied intensity',
    met: 7.0,
  },
  {
    id: 'badminton',
    name: 'Badminton',
    emoji: '🏸',
    intensity: 0.45,
    defaultDurationMin: 45,
    category: 'sports',
    description: 'Singles or doubles game',
    met: 5.5,
  },
  {
    id: 'basketball',
    name: 'Basketball',
    emoji: '🏀',
    intensity: 0.58,
    defaultDurationMin: 45,
    category: 'sports',
    description: 'Half-court or full-court game',
    met: 6.5,
  },
];

// Intensity description labels for UI display
export const INTENSITY_LABELS: Record<string, string> = {
  light: 'Light (0.1–0.3) — Heart rate slightly elevated',
  moderate: 'Moderate (0.3–0.55) — Breathing harder, can talk',
  vigorous: 'Vigorous (0.55–0.75) — Breathing hard, short sentences',
  maximal: 'Maximal (0.75–0.9) — Near limit, very short bursts',
};

export function getIntensityLabel(intensity: number): string {
  if (intensity < 0.30) return 'Light';
  if (intensity < 0.55) return 'Moderate';
  if (intensity < 0.75) return 'Vigorous';
  return 'Maximal';
}

export function getIntensityColor(intensity: number): string {
  if (intensity < 0.30) return '#10b981';  // green
  if (intensity < 0.55) return '#f59e0b';  // amber
  if (intensity < 0.75) return '#f97316';  // orange
  return '#ef4444';                         // red
}

export const EXERCISE_CATEGORIES = [
  { id: 'all', label: 'All', emoji: '🏅' },
  { id: 'daily', label: 'Daily', emoji: '🚶' },
  { id: 'cardio', label: 'Cardio', emoji: '🏃' },
  { id: 'strength', label: 'Strength', emoji: '💪' },
  { id: 'flexibility', label: 'Flexibility', emoji: '🧘' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
] as const;
