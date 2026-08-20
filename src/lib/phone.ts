/**
 * Phone helpers shared by the form, the server action, and the register.
 * A number typed without a "+" is treated as North American and formatted
 * as (613) 555-0134; a number starting with "+" is left as an international
 * number and only stripped of stray characters.
 */

export function formatPhone(raw: string): string {
  const trimmed = raw.trimStart();
  if (trimmed.startsWith("+")) {
    return "+" + trimmed.slice(1).replace(/\D/g, "").slice(0, 15);
  }
  const digits = trimmed.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) {
    return digits.length >= 8 && digits.length <= 15;
  }
  return digits.length === 10;
}

/** Digits only, with the country code, for building a wa.me link. */
export function whatsappDigits(value: string): string {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) return digits;
  if (digits.length === 10) return `1${digits}`;
  return digits;
}

export function whatsappLink(value: string): string {
  return `https://wa.me/${whatsappDigits(value)}`;
}
