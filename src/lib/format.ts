export function parseGenToWei(value: string): bigint {
  const [wholeRaw, decimalRaw = ""] = value.trim().split(".");
  const whole = wholeRaw === "" ? "0" : wholeRaw;
  const decimal = decimalRaw.padEnd(18, "0").slice(0, 18);

  if (!/^\d+$/.test(whole) || !/^\d+$/.test(decimal)) {
    throw new Error("Invalid GEN amount");
  }

  return BigInt(whole) * 10n ** 18n + BigInt(decimal);
}

export function formatWeiToGen(value: string | bigint): string {
  const wei = typeof value === "bigint" ? value : BigInt(value || "0");
  const whole = wei / 10n ** 18n;
  const decimal = wei % 10n ** 18n;
  const decimalText = decimal.toString().padStart(18, "0").replace(/0+$/, "");
  return decimalText ? `${whole}.${decimalText}` : whole.toString();
}

export function shortAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  try {
    if (!value) return fallback;
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
