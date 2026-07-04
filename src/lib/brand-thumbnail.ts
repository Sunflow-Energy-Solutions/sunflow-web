const PALETTE: [string, string][] = [
  ["#17305a", "#0a1730"], // navy (default/residential)
  ["#0f4c4c", "#082e2e"], // teal
  ["#4a2f6b", "#2b1a40"], // plum
  ["#1f4d3d", "#0f2b21"], // forest
  ["#5a3a1a", "#331f0d"], // amber-brown
  ["#5a1f2e", "#33111a"], // wine
  ["#2c3e50", "#182530"], // slate
  ["#3a4a6b", "#1f2740"], // indigo
  ["#4d3319", "#2b1c0e"], // rust
  ["#264d5c", "#132630"], // steel blue
  ["#3d2645", "#211427"], // aubergine
  ["#1a4a4a", "#0d2929"], // deep teal
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getBrandGradient(brand: string): [string, string] {
  const index = hashString(brand) % PALETTE.length;
  return PALETTE[index];
}

export function getBrandInitials(brand: string): string {
  const words = brand
    .replace(/[()]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
