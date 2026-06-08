/** Lightweight client-side validation for auth forms. */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | undefined {
  if (email.trim().length === 0) {
    return "Email is required.";
  }
  if (!EMAIL_PATTERN.test(email.trim())) {
    return "Enter a valid email address.";
  }
  return undefined;
}

export function validatePassword(password: string, minLength = 1): string | undefined {
  if (password.length === 0) {
    return "Password is required.";
  }
  if (password.length < minLength) {
    return `Password must be at least ${minLength} characters.`;
  }
  return undefined;
}
