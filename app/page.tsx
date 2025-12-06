'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Zap, Users, TrendingUp, LogIn } from "lucide-react";
import { useEffect, useState } from "react";
import { HealthVineDecoration } from "@/components/ui/health-vine-decoration";
import { LoginModal } from "@/components/auth/login-modal";

const stats = [
  { value: "23L+", label: "Steps Completed", icon: TrendingUp },
  { value: "50K+", label: "Active Members", icon: Users },
  { value: "₹2Cr+", label: "Health Achieved", icon: Zap },
];

const testimonials = [
  {
    name: "Priya",
    text: "Happy First Club transformed my daily routine. The community support keeps me motivated!",
    initials: "P",
  },
  {
    name: "Arjun",
    text: "Love how gamified it is. I completed 50k steps this month thanks to the leaderboard!",
    initials: "A",
  },
  {
    name: "Sneha",
    text: "Finally found a wellness platform that feels like a friend, not a dictator.",
    initials: "S",
  },
];

export default function LandingPage() {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("ref");
    if (code) {
      setReferralCode(code);
    }
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="fixed bottom-0 right-0 z-0 pointer-events-none">
        <HealthVineDecoration />
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold">
              😄
            </div>
            Happy First
          </Link>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLoginModal(true)}
              className="gap-2 border-primary/30 hover:bg-primary/10"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </Button>
            <Link href="/login">
              <Button className="bg-primary hover:bg-primary/90">Join Now</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-2">
              Your <span className="text-primary">wellness journey</span> starts with community
            </h1>
            <p className="text-xl text-muted-foreground text-balance">
              Join thousands tracking activities, competing on leaderboards, and supporting each other daily via WhatsApp.
            </p>
          </div>

          <Link href="/register">
            <Button className="h-12 px-8 text-base bg-primary hover:bg-primary/90 gap-2">
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>

          {referralCode && (
            <div className="bg-secondary/50 border border-primary/20 rounded-lg p-4 text-sm">
              <p className="text-foreground">
                Welcome! You've been referred with code: <span className="font-bold text-primary">{referralCode}</span>
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-secondary/30 border-y border-gray-200 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="flex flex-col items-center gap-3">
                  <Icon className="w-8 h-8 text-primary" />
                  <div className="text-3xl font-bold text-primary">{stat.value}</div>
                  <p className="text-muted-foreground text-center">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-foreground mb-12">
            What is Happy First Club?
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {[{
              icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              ),
              title: 'Track Your Goals',
              description: 'Set personalized wellness targets and monitor your progress with detailed analytics and insights.'
            }, {
              icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              ),
              title: 'WhatsApp Integration',
              description: 'Get daily reminders, share achievements, and stay connected with your wellness community.'
            }].map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-md transition">
                <h3 className="font-semibold text-lg mb-2 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 px-4 bg-secondary/30 relative z-10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">What Our Community Says</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <Card key={i} className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="font-bold text-primary">{testimonial.initials}</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{testimonial.name}</h4>
                  </div>
                </div>
                <p className="text-muted-foreground italic">"{testimonial.text}"</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary/10 to-accent/10 relative z-10">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Ready to start your wellness journey?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of members already transforming their lives
          </p>
          <Link href="/register">
            <Button className="h-12 px-8 text-base bg-primary hover:bg-primary/90">
              Join Happy First Club
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 px-4">
        <div className="max-w-7xl mx-auto text-center text-muted-foreground text-sm">
          <p>© 2025 Happy First Club. All rights reserved.</p>
        </div>
      </footer>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  );
}
