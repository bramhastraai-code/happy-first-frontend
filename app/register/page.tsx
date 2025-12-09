'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'details'>('phone');
  const [formData, setFormData] = useState({
    phoneNumber: '',
    countryCode: '+91',
    name: '',
    email: '',
    password: '',
    city: '',
    locationPin: '',
    dateOfBirth: '',
    referredBy: '',
    timezone: 'Asia/Kolkata',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phoneNumber) {
      setError('Phone number is required');
      return;
    }
    setStep('details');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authAPI.register(formData);
      // After registration, go to OTP verification
      // Encode country code to properly handle + sign in URL
      router.push(`/verify-otp?phone=${formData.phoneNumber}&country=${encodeURIComponent(formData.countryCode)}`);
    } catch (err) {
      setError((err as any).response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to</h1>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Happy First Club
          </h2>
          <p className="text-gray-600 mt-2">Start your wellness journey today</p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country Code
              </label>
              <select
                value={formData.countryCode}
                onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="+91">+91 (India)</option>
                <option value="+1">+1 (USA/Canada)</option>
                <option value="+44">+44 (UK)</option>
                <option value="+61">+61 (Australia)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <Input
                type="tel"
                placeholder="9999999999"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Referral Code (Optional)
              </label>
              <Input
                type="text"
                placeholder="Enter referral code"
                value={formData.referredBy}
                onChange={(e) => setFormData({ ...formData, referredBy: e.target.value })}
              />
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              Continue
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <Input
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <Input
                type="password"
                placeholder="Enter password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City (Optional)
              </label>
              <Input
                type="text"
                placeholder="Mumbai"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location Pin (Optional)
              </label>
              <Input
                type="text"
                placeholder="400001"
                value={formData.locationPin}
                onChange={(e) => setFormData({ ...formData, locationPin: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth (Optional)
              </label>
              <Input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              />
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

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('phone')}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Registering...' : 'Register'}
              </Button>
            </div>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <a href="/login" className="text-blue-600 hover:underline font-medium">
            Login
          </a>
        </div>
      </div>
    </div>
  );
}
