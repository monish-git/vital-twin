// constants/substancePresets.ts
// Common lifestyle substances supported by BioGears

export interface SubstancePreset {
  id: string;
  name: string;           // matches BioGears substance name exactly
  emoji: string;
  displayName: string;    // user-friendly name
  unit: string;           // BioGears unit (mg, mL, g, ug)
  defaultDose: number;
  minDose: number;
  maxDose: number;
  category: 'stimulant' | 'alcohol' | 'nicotine' | 'medicinal' | 'other';
  description?: string;
  commonAmounts?: { label: string; value: number }[];
}

export const SUBSTANCE_PRESETS: SubstancePreset[] = [
  // ── STIMULANTS ────────────────────────────────────────────
  {
    id: 'caffeine_coffee',
    name: 'Caffeine',
    displayName: 'Coffee (1 cup)',
    emoji: '☕',
    unit: 'mg',
    defaultDose: 80,
    minDose: 10,
    maxDose: 400,
    category: 'stimulant',
    description: 'Effects: HR +5–10%, BP slight rise, alertness ↑',
    commonAmounts: [
      { label: 'Espresso', value: 60 },
      { label: 'Filter Coffee', value: 80 },
      { label: 'Cappuccino', value: 75 },
      { label: 'Energy Drink', value: 120 },
      { label: 'Tea (black)', value: 40 },
      { label: 'Green Tea', value: 25 },
    ],
  },
  // ── NICOTINE ──────────────────────────────────────────────
  {
    id: 'nicotine_cigarette',
    name: 'Nicotine',
    displayName: 'Cigarette',
    emoji: '🚬',
    unit: 'mg',
    defaultDose: 1.0,
    minDose: 0.5,
    maxDose: 4.0,
    category: 'nicotine',
    description: 'Effects: HR ↑, BP ↑, vasoconstriction',
    commonAmounts: [
      { label: 'Cigarette (light)', value: 0.8 },
      { label: 'Cigarette (regular)', value: 1.0 },
      { label: 'Cigarette (strong)', value: 1.5 },
      { label: 'Vaping (moderate)', value: 1.2 },
      { label: 'Bidi', value: 1.0 },
    ],
  },
];

// Alcohol is handled separately with standard drinks model
export interface AlcoholAmount {
  label: string;
  standardDrinks: number;
  description: string;
  emoji: string;
}

export const ALCOHOL_PRESETS: AlcoholAmount[] = [
  { label: 'Beer (330mL)', standardDrinks: 1.0, description: '~5% ABV', emoji: '🍺' },
  { label: 'Beer (650mL)', standardDrinks: 2.0, description: 'Large bottle', emoji: '🍺' },
  { label: 'Wine (120mL)', standardDrinks: 1.0, description: 'One glass', emoji: '🍷' },
  { label: 'Wine (250mL)', standardDrinks: 2.0, description: 'Large pour', emoji: '🍷' },
  { label: 'Whisky/Rum peg (30mL)', standardDrinks: 1.0, description: '~40% ABV', emoji: '🥃' },
  { label: 'Double peg (60mL)', standardDrinks: 2.0, description: 'Strong measure', emoji: '🥃' },
  { label: 'Vodka shot (30mL)', standardDrinks: 1.0, description: '~40% ABV', emoji: '🥃' },
  { label: 'Custom', standardDrinks: 1.0, description: 'Enter amount', emoji: '🍾' },
];

// Stress (modelled as PainStimulus in BioGears)
export interface StressPreset {
  id: string;
  label: string;
  emoji: string;
  severity: number;  // 0.0–1.0
  description: string;
}

export const STRESS_PRESETS: StressPreset[] = [
  { id: 'minimal', label: 'Minimal', emoji: '😌', severity: 0.05, description: 'Very mild — slight background tension' },
  { id: 'mild', label: 'Mild Worry', emoji: '😟', severity: 0.20, description: 'Mild stress — slightly elevated HR/BP' },
  { id: 'moderate', label: 'Moderate', emoji: '😰', severity: 0.40, description: 'Noticeable stress — palpitations, tension' },
  { id: 'high', label: 'High Stress', emoji: '😨', severity: 0.65, description: 'Strong stress — significant HR/BP elevation' },
  { id: 'severe', label: 'Severe / Panic', emoji: '😱', severity: 0.90, description: 'Panic-level — maximum sympathetic response' },
];

// Fasting presets
export interface FastingPreset {
  id: string;
  label: string;
  emoji: string;
  hours: number;
  description: string;
}

export const FASTING_PRESETS: FastingPreset[] = [
  { id: '12h', label: '12 Hours', emoji: '🌙', hours: 12, description: 'Overnight fast' },
  { id: '14h', label: '14 Hours', emoji: '⏱️', hours: 14, description: 'Early dinner–late breakfast' },
  { id: '16h', label: '16 Hours (16:8)', emoji: '🔥', hours: 16, description: 'Most popular IF protocol' },
  { id: '18h', label: '18 Hours', emoji: '⚡', hours: 18, description: 'Extended IF' },
  { id: '24h', label: '24 Hours', emoji: '🏆', hours: 24, description: 'Full day fast (Navratri/Ekadashi)' },
  { id: 'custom', label: 'Custom', emoji: '✏️', hours: 0, description: 'Set your own duration' },
];

// Water quick-add amounts
export const WATER_QUICK_AMOUNTS = [
  { label: '100 mL', value: 100, emoji: '💧' },
  { label: '200 mL', value: 200, emoji: '💧' },
  { label: '300 mL', value: 300, emoji: '💧' },
  { label: '500 mL', value: 500, emoji: '💧' },
  { label: '750 mL', value: 750, emoji: '💧' },
  { label: '1 L', value: 1000, emoji: '🫙' },
  { label: '1.5 L', value: 1500, emoji: '🫙' },
];
