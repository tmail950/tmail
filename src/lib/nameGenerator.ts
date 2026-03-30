import { ASIAN_NAMES } from './asianNames';

const usedNames = new Set<string>();

export function generateAsianName(): string {
  // If we somehow use all combinations (unlikely), reset
  if (usedNames.size > ASIAN_NAMES.length * 0.8) {
    usedNames.clear();
  }

  let attempts = 0;
  while (attempts < 50) {
    const name = ASIAN_NAMES[Math.floor(Math.random() * ASIAN_NAMES.length)];
    const randomNum = Math.floor(100 + Math.random() * 899);
    const candidate = `${name}${randomNum}`;
    
    if (!usedNames.has(candidate)) {
      usedNames.add(candidate);
      return candidate;
    }
    attempts++;
  }
  
  // Fallback
  return `${ASIAN_NAMES[0]}${Date.now().toString().slice(-4)}`;
}
