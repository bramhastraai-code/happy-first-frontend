export function validatePhone(phone: string): string | null {
  if (!phone.trim()) return 'Phone number is required';
  if (!/^\d{10}$/.test(phone)) return 'Enter a valid 10-digit phone number';
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) return 'Password must be at least 6 characters';
  return null;
}

export function validatePinCode(pin: string): string | null {
  if (!/^\d{6}$/.test(pin)) return 'Enter a valid 6-digit pin code';
  return null;
}

export function validateDateOfBirth(dob: string): string | null {
  if (!dob) return 'Date of birth is required';
  const birth = new Date(dob);
  const today = new Date();
  if (birth > today) return 'Date of birth cannot be in the future';

  const age =
    today.getFullYear() -
    birth.getFullYear() -
    (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);

  if (age < 13) return 'You must be at least 13 years old to register';
  return null;
}

export type PasswordStrength = 'empty' | 'weak' | 'fair' | 'strong';

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return 'empty';
  if (password.length < 6) return 'weak';

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const variety = [hasLower, hasUpper, hasNumber].filter(Boolean).length;

  if (password.length >= 8 && variety >= 2) return 'strong';
  return 'fair';
}
