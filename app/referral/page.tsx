'use client';

import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Share2, Copy, Mail, MessageCircle } from 'lucide-react';
import {authAPI} from '@/lib/api/auth';
import { useEffect, useState } from 'react';

export default function ReferralPage() {
  const [referralCode, setReferralCode] = useState('');
  useEffect(() => {
    authAPI.userInfo().then((response) => {
      setReferralCode(response.data.data.referralCode);
    }).catch((error) => {
      console.error('Error fetching user info:', error);
    });
  }, []);

  const referralLink = `https://happyfirst.vercel.app/register?ref=${referralCode}`;
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    alert('Referral link copied to clipboard!');
  };

  const handleShare = (platform: string) => {
    const text = encodeURIComponent(
      `Join me on Happy First Club - building wellness habits together! ${referralLink}`
    );
    
    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${text}`);
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${referralLink}`);
        break;
      case 'mail':
        window.open(`mailto:?subject=Join Happy First Club&body=${text}`);
        break;
      default:
        break;
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white p-4">
        {/* Header Illustration */}
        <div className="text-center py-8">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center mb-4">
            <div className="text-6xl">💪</div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Referral</h1>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
          </div>
        </div>

        {/* Share Options */}
        <div className="max-w-md mx-auto space-y-4 mb-6">
          <div className="grid grid-cols-4 gap-4">
            <button
              onClick={() => handleShare('facebook')}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                <Share2 className="w-8 h-8 text-white" />
              </div>
              <span className="text-xs text-gray-700">Facebook</span>
            </button>
            
            <button
              onClick={() => handleShare('whatsapp')}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <span className="text-xs text-gray-700">WhatsApp</span>
            </button>
            
            <button
              onClick={() => handleShare('mail')}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <span className="text-xs text-gray-700">Mail</span>
            </button>
            
            <button className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-3xl">🔗</span>
              </div>
              <span className="text-xs text-gray-700">Link</span>
            </button>
          </div>
        </div>

        {/* Referral Link Card */}
        <Card className="max-w-md mx-auto mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Copy className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">
                Invite your friends to join our community using the link below.
              </h3>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <p className="text-sm text-gray-700 break-all">{referralLink}</p>
            </div>
            <Button onClick={handleCopyLink} className="w-full bg-blue-600 hover:bg-blue-700">
              <Copy className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
          </CardContent>
        </Card>

        {/* Benefits List */}
        <div className="max-w-md mx-auto space-y-3 mb-6">
          <Card className="border-l-4 border-blue-500">
            <CardContent className="p-4 flex items-start gap-3">
              <span className="text-2xl">🎁</span>
              <div>
                <p className="font-medium text-gray-900 text-sm">
                  Share it with your Friends / Family members
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-green-500">
            <CardContent className="p-4 flex items-start gap-3">
              <span className="text-2xl">🚀</span>
              <div>
                <p className="font-medium text-gray-900 text-sm">
                  Reach New Levels to earn reward when they join through your link
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats */}
        <div className="max-w-md mx-auto">
          <Card className="bg-gradient-to-br from-purple-50 to-blue-50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Your Impact</h3>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-purple-600">{12}  </p>
                  <p className="text-xs text-gray-600">Referrals</p>
                </div>
                {/* <div>
                  <p className="text-2xl font-bold text-blue-600">8</p>
                  <p className="text-xs text-gray-600">Active</p>
                </div> */}
                <div>
                  <p className="text-2xl font-bold text-green-600">{240}</p>
                  <p className="text-xs text-gray-600">Happy Points</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
