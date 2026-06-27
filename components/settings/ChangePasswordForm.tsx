'use client';

import { useState } from 'react';
import { authAPI } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

function ValidationItem({ text, isValid }: { text: string; isValid: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {isValid ? (
        <CheckCircle className="h-3.5 w-3.5 text-primary" />
      ) : (
        <span className="h-3.5 w-3.5 rounded-full border-2 border-border" />
      )}
      <span className={cn('text-xs', isValid ? 'text-foreground' : 'text-muted-foreground')}>
        {text}
      </span>
    </div>
  );
}

export default function ChangePasswordForm() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validations, setValidations] = useState({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
    setSuccess('');

    if (name === 'newPassword') {
      setValidations({
        minLength: value.length >= 8,
        hasUpperCase: /[A-Z]/.test(value),
        hasLowerCase: /[a-z]/.test(value),
        hasNumber: /[0-9]/.test(value),
        hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(value),
      });
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const validateForm = () => {
    if (!formData.currentPassword) {
      setError('Current password is required');
      return false;
    }
    if (!formData.newPassword) {
      setError('New password is required');
      return false;
    }
    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    if (!/[A-Z]/.test(formData.newPassword)) {
      setError('Password must contain at least one uppercase letter');
      return false;
    }
    if (!/[a-z]/.test(formData.newPassword)) {
      setError('Password must contain at least one lowercase letter');
      return false;
    }
    if (!/[0-9]/.test(formData.newPassword)) {
      setError('Password must contain at least one number');
      return false;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword)) {
      setError('Password must contain at least one special character');
      return false;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return false;
    }
    if (formData.currentPassword === formData.newPassword) {
      setError('New password must be different from current password');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await authAPI.changePassword({
        oldPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      setSuccess('Password updated successfully.');
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setValidations({
        minLength: false,
        hasUpperCase: false,
        hasLowerCase: false,
        hasNumber: false,
        hasSpecialChar: false,
      });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const allValidationsPassed = Object.values(validations).every(Boolean);
  const passwordsMatch =
    formData.confirmPassword.length > 0 && formData.newPassword === formData.confirmPassword;

  const renderPasswordField = (
    label: string,
    name: 'currentPassword' | 'newPassword' | 'confirmPassword',
    field: 'current' | 'new' | 'confirm',
    placeholder: string
  ) => (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-foreground">{label}</label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type={showPasswords[field] ? 'text' : 'password'}
          name={name}
          value={formData[name]}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="pl-9 pr-10"
          disabled={loading}
        />
        <button
          type="button"
          onClick={() => togglePasswordVisibility(field)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={showPasswords[field] ? 'Hide password' : 'Show password'}
        >
          {showPasswords[field] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  if (success) {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary-soft px-4 py-5 text-center">
        <CheckCircle className="mx-auto mb-2 h-8 w-8 text-primary" />
        <p className="text-sm font-semibold text-foreground">{success}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => setSuccess('')}
        >
          Change again
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {renderPasswordField('Current password', 'currentPassword', 'current', 'Enter current password')}
      {renderPasswordField('New password', 'newPassword', 'new', 'Enter new password')}

      {formData.newPassword && (
        <div className="rounded-xl border border-border bg-secondary/40 p-3 space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Requirements
          </p>
          <ValidationItem text="At least 8 characters" isValid={validations.minLength} />
          <ValidationItem text="One uppercase letter" isValid={validations.hasUpperCase} />
          <ValidationItem text="One lowercase letter" isValid={validations.hasLowerCase} />
          <ValidationItem text="One number" isValid={validations.hasNumber} />
          <ValidationItem text="One special character" isValid={validations.hasSpecialChar} />
        </div>
      )}

      {renderPasswordField('Confirm password', 'confirmPassword', 'confirm', 'Confirm new password')}

      {formData.confirmPassword && !passwordsMatch && (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          Passwords do not match
        </p>
      )}

      {error && (
        <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={loading || !allValidationsPassed || !passwordsMatch}
        className="w-full sm:w-auto"
      >
        {loading ? 'Updating…' : 'Update password'}
      </Button>

      <p className="text-[11px] text-muted-foreground">
        Use a unique password and avoid personal information in it.
      </p>
    </form>
  );
}
