export function getCoachAdvice(score: number) {
  if (score > 80) return "Elite cognitive performance!";
  if (score > 60) return "Good focus — keep training!";
  return "Practice more to improve neural speed.";
}
