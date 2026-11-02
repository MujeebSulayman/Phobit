const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type ContactKind = "phone" | "email";
export type ParsedContact = { key: string; kind: ContactKind; contact: string } | { error: string };

/** "+1 ••• ••• 0123" / "j•••n@example.com" */
export function maskContact(kind: ContactKind, value: string): string {
  if (kind === "email") {
    const [user, domain] = value.split("@");
    if (!domain) return "•••";
    const first = user.slice(0, 1);
    const last = user.length > 2 ? user.slice(-1) : "";
    return `${first}•••${last}@${domain}`;
  }
  const digits = value.replace(/\D/g, "");
  const cc = digits.length > 10 ? `+${digits.slice(0, digits.length - 10)} ` : "+";
  return `${cc}••• ••• ${digits.slice(-4)}`;
}

/** Normalises a phone number to E.164 (assumes +1 for bare 10-digit numbers) or validates an email. */
export function parseContact(kind: ContactKind, input: string): ParsedContact {
  const value = input.trim();
  if (!value) return { error: kind === "phone" ? "Enter a phone number" : "Enter an email address" };

  if (kind === "email") {
    const email = value.toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 254) return { error: "That doesn't look like an email address" };
    return { key: `email:${email}`, kind, contact: email };
  }

  const hasPlus = value.startsWith("+");
  let digits = value.replace(/\D/g, "");
  if (!hasPlus) {
    if (digits.length === 10) digits = `1${digits}`;
    else if (!(digits.length === 11 && digits.startsWith("1")))
      return { error: "Include the country code, e.g. +1 415 555 0123" };
  }
  if (digits.length < 8 || digits.length > 15) return { error: "That doesn't look like a phone number" };
  const e164 = `+${digits}`;
  return { key: `phone:${e164}`, kind, contact: e164 };
}
