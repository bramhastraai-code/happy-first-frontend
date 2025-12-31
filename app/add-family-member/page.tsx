'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ArrowLeft, UserPlus, CheckCircle, AlertCircle } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';

export default function AddFamilyMemberPage() {
  const router = useRouter();
  const { setProfiles, profiles } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    age: '',
    gender: 'other' as 'male' | 'female' | 'other',
    timezone: 'Asia/Kolkata',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const maxMembers = 5;
  const currentMembers = profiles?.length || 0;
  const canAddMore = currentMembers < maxMembers;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

    if (!formData.age || parseInt(formData.age) <= 0) {
      setError('Valid age is required');
      return false;
    }

    if (parseInt(formData.age) > 120) {
      setError('Please enter a valid age');
      return false;
    }

    if (!formData.gender) {
      setError('Gender is required');
      return false;
    }

    if (!canAddMore) {
      setError('Maximum 5 family members allowed');
      return false;
    }
    if (!formData.timezone.trim()) {
      setError('Timezone is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authAPI.addFamilyMember({
        name: formData.name.trim(),
        relationship: formData.relationship.trim(),
        age: parseInt(formData.age),
        gender: formData.gender,
        level: 'newbie',
        timezone: formData.timezone.trim(),
      });

      // Update user in store with new family member
      if (response.data.data) {
        setProfiles(response.data.data);
      }

      setSuccess(true);

      // Redirect to profile selection after 1.5 seconds
      setTimeout(() => {
        router.push('/select-profile');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add family member. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const relationships = [
    { value: 'spouse', label: 'Spouse/Partner' },
    { value: 'child', label: 'Child' },
    { value: 'parent', label: 'Parent' },
    { value: 'sibling', label: 'Sibling' },
    { value: 'grandparent', label: 'Grandparent' },
    { value: 'grandchild', label: 'Grandchild' },
    { value: 'other', label: 'Other' },
  ];

  if (!canAddMore) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 py-8">
          <div className="max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-white rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-gray-700" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Add Family Member</h1>
            </div>

            <Card className="p-6 text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-10 h-10 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Maximum Limit Reached</h3>
              <p className="text-gray-600 mb-4">
                You have already added {maxMembers} family members. This is the maximum allowed.
              </p>
              <Button
                onClick={() => router.push('/select-profile')}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
              >
                View Profiles
              </Button>
            </Card>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Add Family Member</h1>
          </div>

          {/* Counter */}
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600">
              {currentMembers} of {maxMembers} family members added
            </p>
          </div>

          <Card className="p-6">
            {success ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Member Added!</h3>
                <p className="text-gray-600">Family member has been added successfully.</p>
                <p className="text-sm text-gray-500 mt-2">Redirecting...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter name"
                    disabled={loading}
                    className="w-full"
                  />
                </div>

                {/* Relationship */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Relationship <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="relationship"
                    value={formData.relationship}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select relationship</option>
                    {relationships.map(rel => (
                      <option key={rel.value} value={rel.value}>
                        {rel.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Age */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    placeholder="Enter age"
                    min="1"
                    max="120"
                    disabled={loading}
                    className="w-full"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'male', label: 'Male', color: 'blue' },
                      { value: 'female', label: 'Female', color: 'pink' },
                      { value: 'other', label: 'Other', color: 'purple' },
                    ].map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, gender: option.value as any }))}
                        disabled={loading}
                        className={`py-3 px-4 rounded-lg border-2 transition-all ${formData.gender === option.value
                            ? `border-${option.color}-500 bg-${option.color}-50 text-${option.color}-700`
                            : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Timezone
                  </label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <optgroup label="Asia">
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                      <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                      <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                      <option value="Asia/Shanghai">Asia/Shanghai (CST)</option>
                      <option value="Asia/Hong_Kong">Asia/Hong_Kong (HKT)</option>
                      <option value="Asia/Bangkok">Asia/Bangkok (ICT)</option>
                      <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                      <option value="Asia/Seoul">Asia/Seoul (KST)</option>
                      <option value="Asia/Taipei">Asia/Taipei (CST)</option>
                      <option value="Asia/Manila">Asia/Manila (PHT)</option>
                      <option value="Asia/Karachi">Asia/Karachi (PKT)</option>
                      <option value="Asia/Dhaka">Asia/Dhaka (BST)</option>
                      <option value="Asia/Colombo">Asia/Colombo (IST)</option>
                      <option value="Asia/Kathmandu">Asia/Kathmandu (NPT)</option>
                      <option value="Asia/Kabul">Asia/Kabul (AFT)</option>
                      <option value="Asia/Tehran">Asia/Tehran (IRST)</option>
                      <option value="Asia/Baghdad">Asia/Baghdad (AST)</option>
                      <option value="Asia/Jerusalem">Asia/Jerusalem (IST)</option>
                      <option value="Asia/Riyadh">Asia/Riyadh (AST)</option>
                      <option value="Asia/Kuwait">Asia/Kuwait (AST)</option>
                      <option value="Asia/Bahrain">Asia/Bahrain (AST)</option>
                      <option value="Asia/Qatar">Asia/Qatar (AST)</option>
                      <option value="Asia/Muscat">Asia/Muscat (GST)</option>
                      <option value="Asia/Baku">Asia/Baku (AZT)</option>
                      <option value="Asia/Yerevan">Asia/Yerevan (AMT)</option>
                      <option value="Asia/Tbilisi">Asia/Tbilisi (GET)</option>
                      <option value="Asia/Vladivostok">Asia/Vladivostok (VLAT)</option>
                      <option value="Asia/Yakutsk">Asia/Yakutsk (YAKT)</option>
                      <option value="Asia/Irkutsk">Asia/Irkutsk (IRKT)</option>
                      <option value="Asia/Novosibirsk">Asia/Novosibirsk (NOVT)</option>
                      <option value="Asia/Omsk">Asia/Omsk (OMST)</option>
                      <option value="Asia/Yekaterinburg">Asia/Yekaterinburg (YEKT)</option>
                    </optgroup>
                    <optgroup label="Europe">
                      <option value="Europe/London">Europe/London (GMT)</option>
                      <option value="Europe/Paris">Europe/Paris (CET)</option>
                      <option value="Europe/Berlin">Europe/Berlin (CET)</option>
                      <option value="Europe/Rome">Europe/Rome (CET)</option>
                      <option value="Europe/Madrid">Europe/Madrid (CET)</option>
                      <option value="Europe/Brussels">Europe/Brussels (CET)</option>
                      <option value="Europe/Amsterdam">Europe/Amsterdam (CET)</option>
                      <option value="Europe/Vienna">Europe/Vienna (CET)</option>
                      <option value="Europe/Prague">Europe/Prague (CET)</option>
                      <option value="Europe/Warsaw">Europe/Warsaw (CET)</option>
                      <option value="Europe/Budapest">Europe/Budapest (CET)</option>
                      <option value="Europe/Athens">Europe/Athens (EET)</option>
                      <option value="Europe/Helsinki">Europe/Helsinki (EET)</option>
                      <option value="Europe/Stockholm">Europe/Stockholm (CET)</option>
                      <option value="Europe/Oslo">Europe/Oslo (CET)</option>
                      <option value="Europe/Copenhagen">Europe/Copenhagen (CET)</option>
                      <option value="Europe/Dublin">Europe/Dublin (GMT)</option>
                      <option value="Europe/Lisbon">Europe/Lisbon (WET)</option>
                      <option value="Europe/Zurich">Europe/Zurich (CET)</option>
                      <option value="Europe/Moscow">Europe/Moscow (MSK)</option>
                      <option value="Europe/Istanbul">Europe/Istanbul (TRT)</option>
                      <option value="Europe/Bucharest">Europe/Bucharest (EET)</option>
                      <option value="Europe/Sofia">Europe/Sofia (EET)</option>
                      <option value="Europe/Belgrade">Europe/Belgrade (CET)</option>
                      <option value="Europe/Zagreb">Europe/Zagreb (CET)</option>
                    </optgroup>
                    <optgroup label="America - North">
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="America/Chicago">America/Chicago (CST)</option>
                      <option value="America/Denver">America/Denver (MST)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                      <option value="America/Phoenix">America/Phoenix (MST)</option>
                      <option value="America/Anchorage">America/Anchorage (AKST)</option>
                      <option value="America/Honolulu">Pacific/Honolulu (HST)</option>
                      <option value="America/Toronto">America/Toronto (EST)</option>
                      <option value="America/Vancouver">America/Vancouver (PST)</option>
                      <option value="America/Montreal">America/Montreal (EST)</option>
                      <option value="America/Mexico_City">America/Mexico_City (CST)</option>
                      <option value="America/Cancun">America/Cancun (EST)</option>
                      <option value="America/Tijuana">America/Tijuana (PST)</option>
                    </optgroup>
                    <optgroup label="America - Central & Caribbean">
                      <option value="America/Guatemala">America/Guatemala (CST)</option>
                      <option value="America/Belize">America/Belize (CST)</option>
                      <option value="America/Costa_Rica">America/Costa_Rica (CST)</option>
                      <option value="America/El_Salvador">America/El_Salvador (CST)</option>
                      <option value="America/Tegucigalpa">America/Tegucigalpa (CST)</option>
                      <option value="America/Managua">America/Managua (CST)</option>
                      <option value="America/Panama">America/Panama (EST)</option>
                      <option value="America/Havana">America/Havana (CST)</option>
                      <option value="America/Jamaica">America/Jamaica (EST)</option>
                      <option value="America/Port-au-Prince">America/Port-au-Prince (EST)</option>
                      <option value="America/Santo_Domingo">America/Santo_Domingo (AST)</option>
                      <option value="America/Puerto_Rico">America/Puerto_Rico (AST)</option>
                      <option value="America/Barbados">America/Barbados (AST)</option>
                    </optgroup>
                    <optgroup label="America - South">
                      <option value="America/Bogota">America/Bogota (COT)</option>
                      <option value="America/Caracas">America/Caracas (VET)</option>
                      <option value="America/Lima">America/Lima (PET)</option>
                      <option value="America/Santiago">America/Santiago (CLT)</option>
                      <option value="America/Buenos_Aires">America/Buenos_Aires (ART)</option>
                      <option value="America/Sao_Paulo">America/Sao_Paulo (BRT)</option>
                      <option value="America/Rio_de_Janeiro">America/Rio_de_Janeiro (BRT)</option>
                      <option value="America/Montevideo">America/Montevideo (UYT)</option>
                      <option value="America/Asuncion">America/Asuncion (PYT)</option>
                      <option value="America/La_Paz">America/La_Paz (BOT)</option>
                      <option value="America/Guayaquil">America/Guayaquil (ECT)</option>
                    </optgroup>
                    <optgroup label="Africa">
                      <option value="Africa/Cairo">Africa/Cairo (EET)</option>
                      <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                      <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                      <option value="Africa/Johannesburg">Africa/Johannesburg (SAST)</option>
                      <option value="Africa/Casablanca">Africa/Casablanca (WET)</option>
                      <option value="Africa/Algiers">Africa/Algiers (CET)</option>
                      <option value="Africa/Tunis">Africa/Tunis (CET)</option>
                      <option value="Africa/Tripoli">Africa/Tripoli (EET)</option>
                      <option value="Africa/Khartoum">Africa/Khartoum (CAT)</option>
                      <option value="Africa/Addis_Ababa">Africa/Addis_Ababa (EAT)</option>
                      <option value="Africa/Dar_es_Salaam">Africa/Dar_es_Salaam (EAT)</option>
                      <option value="Africa/Kampala">Africa/Kampala (EAT)</option>
                      <option value="Africa/Lusaka">Africa/Lusaka (CAT)</option>
                      <option value="Africa/Harare">Africa/Harare (CAT)</option>
                      <option value="Africa/Maputo">Africa/Maputo (CAT)</option>
                      <option value="Africa/Accra">Africa/Accra (GMT)</option>
                      <option value="Africa/Dakar">Africa/Dakar (GMT)</option>
                      <option value="Africa/Abidjan">Africa/Abidjan (GMT)</option>
                    </optgroup>
                    <optgroup label="Australia & Pacific">
                      <option value="Australia/Sydney">Australia/Sydney (AEDT)</option>
                      <option value="Australia/Melbourne">Australia/Melbourne (AEDT)</option>
                      <option value="Australia/Brisbane">Australia/Brisbane (AEST)</option>
                      <option value="Australia/Perth">Australia/Perth (AWST)</option>
                      <option value="Australia/Adelaide">Australia/Adelaide (ACDT)</option>
                      <option value="Australia/Darwin">Australia/Darwin (ACST)</option>
                      <option value="Pacific/Auckland">Pacific/Auckland (NZDT)</option>
                      <option value="Pacific/Fiji">Pacific/Fiji (FJT)</option>
                      <option value="Pacific/Guam">Pacific/Guam (ChST)</option>
                      <option value="Pacific/Port_Moresby">Pacific/Port_Moresby (PGT)</option>
                      <option value="Pacific/Tahiti">Pacific/Tahiti (TAHT)</option>
                      <option value="Pacific/Tongatapu">Pacific/Tongatapu (TOT)</option>
                      <option value="Pacific/Samoa">Pacific/Samoa (SST)</option>
                    </optgroup>
                    <optgroup label="Atlantic">
                      <option value="Atlantic/Reykjavik">Atlantic/Reykjavik (GMT)</option>
                      <option value="Atlantic/Azores">Atlantic/Azores (AZOT)</option>
                      <option value="Atlantic/Cape_Verde">Atlantic/Cape_Verde (CVT)</option>
                      <option value="Atlantic/Bermuda">Atlantic/Bermuda (AST)</option>
                    </optgroup>
                  </select>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Adding Member...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5" />
                      Add Family Member
                    </div>
                  )}
                </Button>
              </form>
            )}
          </Card>

          {/* Info Box */}
          {!success && (
            <Card className="mt-4 p-4 bg-blue-50 border-blue-200">
              <p className="text-sm text-gray-700">
                <strong>Note:</strong> Each family member will have their own profile with separate progress tracking and activity history.
              </p>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
