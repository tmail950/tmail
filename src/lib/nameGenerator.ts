const ASIAN_NAMES = [
  "ali", "ahmed", "umar", "usman", "hamza", "bilal", "zain", "ayaan", "rayyan", 
  "sara", "ayesha", "fatima", "zoya", "hira", "musa", "ibrahim", "anaya", "arham",
  "amir", "asad", "fahad", "hassan", "hussain", "imran", "irfan", "kamran"
];

export function generateAsianName(): string {
  const name = ASIAN_NAMES[Math.floor(Math.random() * ASIAN_NAMES.length)];
  const randomNum = Math.floor(100 + Math.random() * 899); // 3-digit random number
  return `${name}${randomNum}`;
}
