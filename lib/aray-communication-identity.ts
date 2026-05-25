export type ArayContactIdentityInput = {
  id?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
};

function normalizeIdentityPart(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function fnv1aHash(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function createStableArayNumber(input: ArayContactIdentityInput) {
  const stableId = normalizeIdentityPart(input.id);
  const source =
    stableId ||
    [input.phone, input.email, input.name, input.company].map(normalizeIdentityPart).filter(Boolean).join("|") ||
    "anonymous-contact";
  const digits = String(fnv1aHash(source)).padStart(8, "0").slice(-8);
  return `AR ${digits.slice(0, 4)} ${digits.slice(4, 6)} ${digits.slice(6)}`;
}

export function normalizeArayNumber(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function getArayNumberDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function formatArayPublicNumber(value: string) {
  return value.replace(/^AR\s*/i, "").trim();
}

export function arayNumbersMatch(expectedNumber: string, inputNumber: string) {
  const expected = normalizeArayNumber(expectedNumber);
  const input = normalizeArayNumber(inputNumber);
  const expectedDigits = getArayNumberDigits(expectedNumber);
  const inputDigits = getArayNumberDigits(inputNumber);

  if (!expected || !input) return false;
  return (
    expected === input ||
    (input.length >= 6 && expected.endsWith(input)) ||
    (inputDigits.length >= 6 && expectedDigits.endsWith(inputDigits))
  );
}

export function createArayMeetingSlug(arayNumber: string) {
  return formatArayPublicNumber(arayNumber)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "aray-room";
}

export function createArayMeetingUrl(arayNumber: string, baseUrl = "https://meet.jit.si") {
  const slug = createArayMeetingSlug(arayNumber);
  const cleanBase = (baseUrl || "https://meet.jit.si").trim().replace(/\/+$/g, "");
  if (cleanBase.includes("{room}")) return cleanBase.replaceAll("{room}", slug);
  return `${cleanBase}/${slug}`;
}
