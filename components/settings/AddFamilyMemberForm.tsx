'use client';

import { useState } from 'react';
import { authAPI } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppSelect } from '@/components/ui/AppSelect';
import { UserPlus, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TIMEZONE_OPTIONS } from '@/lib/utils/timezones';

const RELATIONSHIPS = [
  { value: 'spouse', label: 'Spouse/Partner' },
  { value: 'child', label: 'Child' },
  { value: 'parent', label: 'Parent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'grandchild', label: 'Grandchild' },
  { value: 'other', label: 'Other' },
];

const MAX_MEMBERS = 5;

interface AddFamilyMemberFormProps {
  onSuccess?: () => void;
}

export default function AddFamilyMemberForm({ onSuccess }: AddFamilyMemberFormProps) {
  const { setProfiles, profiles } = useAuthStore();
  const currentMembers = profiles?.length || 0;
  const canAddMore = currentMembers < MAX_MEMBERS;

  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    age: '',
    gender: 'other' as 'male' | 'female' | 'other',
    timezone: 'Asia/Kolkata',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!formData.relationship.trim()) {
      setError('Relationship is required');
      return false;
    }
    if (!formData.age || parseInt(formData.age, 10) <= 0) {
      setError('Valid age is required');
      return false;
    }
    if (parseInt(formData.age, 10) > 120) {
      setError('Please enter a valid age');
      return false;
    }
    if (!canAddMore) {
      setError('Maximum 5 family members allowed');
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
      const response = await authAPI.addFamilyMember({
        name: formData.name.trim(),
        relationship: formData.relationship.trim(),
        age: parseInt(formData.age, 10),
        gender: formData.gender,
        level: 'newbie',
        timezone: formData.timezone.trim(),
      });

      if (response.data.data) {
        setProfiles(response.data.data);
      }

      setSuccess('Family member added successfully.');
      setFormData({
        name: '',
        relationship: '',
        age: '',
        gender: 'other',
        timezone: 'Asia/Kolkata',
      });
      onSuccess?.();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'Failed to add family member. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!canAddMore) {
    return (
      <div className="rounded-xl border border-border bg-secondary/40 px-4 py-5 text-center">
        <AlertCircle className="mx-auto mb-2 h-8 w-8 text-primary" />
        <p className="text-sm font-semibold text-foreground">Maximum limit reached</p>
        <p className="mt-1 text-xs text-muted-foreground">
          You already have {MAX_MEMBERS} family member profiles.
        </p>
      </div>
    );
  }

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
          Add another
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {currentMembers} of {MAX_MEMBERS} family members added
      </p>

      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-foreground">Name</label>
          <Input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter name"
            disabled={loading}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-foreground">Relationship</label>
          <AppSelect
            name="relationship"
            value={formData.relationship}
            onChange={handleInputChange}
            disabled={loading}
          >
            <option value="">Select relationship</option>
            {RELATIONSHIPS.map((rel) => (
              <option key={rel.value} value={rel.value}>
                {rel.label}
              </option>
            ))}
          </AppSelect>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">Age</label>
            <Input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleInputChange}
              placeholder="Age"
              min={1}
              max={120}
              disabled={loading}
              className="h-10 rounded-xl px-3 text-sm shadow-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">Timezone</label>
            <AppSelect
              name="timezone"
              value={formData.timezone}
              onChange={handleInputChange}
              disabled={loading}
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </AppSelect>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-foreground">Gender</label>
          <div className="grid grid-cols-3 gap-2">
            {(['male', 'female', 'other'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, gender: option }))}
                disabled={loading}
                className={cn(
                  'rounded-xl border px-3 py-2 text-xs font-medium capitalize transition-colors',
                  formData.gender === option
                    ? 'border-primary bg-primary-soft text-primary'
                    : 'border-border bg-surface text-muted-foreground hover:bg-accent'
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={loading} className="w-full sm:w-auto">
        {loading ? 'Adding…' : (
          <>
            <UserPlus className="mr-2 h-4 w-4" />
            Add family member
          </>
        )}
      </Button>
    </form>
  );
}
