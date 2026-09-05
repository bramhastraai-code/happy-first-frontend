'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Heart, Sparkles, Users, Sun } from 'lucide-react';
import { authAPI } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/lib/store/authStore';
import { cn } from '@/lib/utils';
import {
  getPendingCommunityId,
} from '@/lib/utils/pendingCommunity';

type Ratings = {
  body: number | null;
  mind: number | null;
  happiness: number | null;
  connected: number | null;
  stress: number | null;
  sleep: number | null;
  todayHappiness: number | null;
};

const TOTAL_STEPS = 16;

function ScalePicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (n: number) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={cn(
            'h-11 rounded-xl border text-sm font-semibold transition-colors',
            value === n
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-surface text-foreground hover:bg-secondary/70'
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function Slide({
  kicker,
  title,
  body,
  children,
}: {
  kicker?: string;
  title?: string;
  body?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      {kicker ? (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{kicker}</p>
      ) : null}
      {title ? (
        <h1 className="font-serif text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
          {title}
        </h1>
      ) : null}
      {body ? <p className="text-sm leading-relaxed text-muted-foreground">{body}</p> : null}
      {children}
    </div>
  );
}

export default function WelcomeOnboarding() {
  const router = useRouter();
  const { selectedProfile, setSelectedProfile, setProfiles, user, setUser } = useAuthStore();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [firstName, setFirstName] = useState(selectedProfile?.name?.split(' ')[0] || '');
  const [surname, setSurname] = useState(selectedProfile?.name?.split(' ').slice(1).join(' ') || '');
  const [email, setEmail] = useState(user?.email || '');
  const [ratings, setRatings] = useState<Ratings>({
    body: null,
    mind: null,
    happiness: null,
    connected: null,
    stress: null,
    sleep: null,
    todayHappiness: null,
  });

  const score = useMemo(() => {
    const stressWellbeing = ratings.stress == null ? null : 11 - ratings.stress;
    const parts = [
      ratings.body,
      ratings.mind,
      ratings.happiness,
      ratings.connected,
      stressWellbeing,
      ratings.sleep,
    ].filter((n): n is number => typeof n === 'number');
    if (!parts.length) return 0;
    return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 10) / 10;
  }, [ratings]);

  const setRating = (key: keyof Ratings, n: number) => {
    setRatings((prev) => ({ ...prev, [key]: n }));
  };

  const canContinue = () => {
    if (step === 5) return ratings.body != null;
    if (step === 6) return ratings.mind != null;
    if (step === 7) return ratings.happiness != null;
    if (step === 8) return ratings.connected != null;
    if (step === 9) return ratings.stress != null;
    if (step === 10) return ratings.sleep != null;
    if (step === 12) return ratings.todayHappiness != null;
    if (step === 14) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (step === 15) return firstName.trim().length > 1 && surname.trim().length > 0;
    return true;
  };

  const finish = async () => {
    setSaving(true);
    setError('');
    try {
      const fullName = `${firstName.trim()} ${surname.trim()}`.trim();
      const res = await authAPI.updateProfile({
        name: fullName,
        email: email.trim(),
        happinessOnboarding: {
          completedAt: new Date().toISOString(),
          body: ratings.body,
          mind: ratings.mind,
          happiness: ratings.happiness,
          connected: ratings.connected,
          stress: ratings.stress,
          sleep: ratings.sleep,
          todayHappiness: ratings.todayHappiness,
          score,
        },
      });
      const profiles = res.data.data.profiles;
      if (Array.isArray(profiles) && profiles.length) {
        setProfiles(profiles);
        const next =
          profiles.find((p) => p._id === selectedProfile?._id) || profiles[0];
        setSelectedProfile(next);
      }
      if (user) setUser({ ...user, email: email.trim(), name: fullName });
      router.replace(getPendingCommunityId() ? '/get-started' : '/create-plan');
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not save your answers. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (step >= TOTAL_STEPS - 1) {
      void finish();
      return;
    }
    setStep((s) => s + 1);
  };

  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(1.5rem+env(safe-area-inset-top,0px))]">
      <div className="mb-6 flex items-center justify-between gap-3">
        {step > 0 ? (
          <button
            type="button"
            onClick={back}
            className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        ) : (
          <span />
        )}
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {step + 1} / {TOTAL_STEPS}
        </p>
      </div>
      <div className="mb-6 h-1 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      <div className="flex-1">
        {step === 0 ? (
          <Slide kicker="Welcome to">
            <h1 className="whitespace-pre-line font-serif text-4xl font-semibold leading-[1.05] text-foreground">
              {`HAPPY\nFIRST\nCLUB`}
            </h1>
            <p className="mt-6 font-serif text-xl text-foreground">You are about to change your life.</p>
          </Slide>
        ) : null}

        {step === 1 ? (
          <Slide kicker="Explore" title="Happy Social" body="Share sparks, follow friends, and celebrate wins together.">
            <div className="rounded-2xl border border-border bg-surface p-4 text-sm text-muted-foreground">
              A kind feed for real life — not a highlight reel.
            </div>
          </Slide>
        ) : null}

        {step === 2 ? (
          <Slide kicker="Explore" title="Happy Community" body="Join groups that keep you consistent with shared weekly targets.">
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
              <Users className="h-6 w-6 text-primary" />
              <p className="text-sm text-muted-foreground">Find your people. Grow together.</p>
            </div>
          </Slide>
        ) : null}

        {step === 3 ? (
          <Slide kicker="Explore" title="Happy Daily Habits" body="I am happy because I choose to Connect, Care, and Celebrate.">
            <ul className="space-y-2">
              {['Connect', 'Care', 'Celebrate'].map((item) => (
                <li
                  key={item}
                  className="rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground"
                >
                  {item}
                </li>
              ))}
            </ul>
          </Slide>
        ) : null}

        {step === 4 ? (
          <Slide
            kicker="Questions"
            title="Body, Mind, Soul"
            body="A few short ratings so we can show you a Happiness Score. You can go back any time."
          >
            <p className="text-sm text-muted-foreground">Then we’ll ask how happy you feel today.</p>
          </Slide>
        ) : null}

        {step === 5 ? (
          <Slide kicker="Body" title="Rate your current status related to your Body.">
            <ScalePicker value={ratings.body} onChange={(n) => setRating('body', n)} />
            <p className="text-xs text-muted-foreground">1 is low · 10 is thriving</p>
          </Slide>
        ) : null}

        {step === 6 ? (
          <Slide kicker="Mind" title="Rate your current status related to your Mind.">
            <ScalePicker value={ratings.mind} onChange={(n) => setRating('mind', n)} />
          </Slide>
        ) : null}

        {step === 7 ? (
          <Slide kicker="Happiness" title="How happy are you feeling overall?">
            <ScalePicker value={ratings.happiness} onChange={(n) => setRating('happiness', n)} />
          </Slide>
        ) : null}

        {step === 8 ? (
          <Slide kicker="Soul" title="How connected do you feel to others?">
            <ScalePicker value={ratings.connected} onChange={(n) => setRating('connected', n)} />
          </Slide>
        ) : null}

        {step === 9 ? (
          <Slide kicker="Mind" title="How often do you feel stressed or anxious?">
            <ScalePicker value={ratings.stress} onChange={(n) => setRating('stress', n)} />
            <p className="text-xs text-muted-foreground">1 is rarely · 10 is almost always</p>
          </Slide>
        ) : null}

        {step === 10 ? (
          <Slide kicker="Body" title="How well do you sleep these days?">
            <ScalePicker value={ratings.sleep} onChange={(n) => setRating('sleep', n)} />
          </Slide>
        ) : null}

        {step === 11 ? (
          <Slide kicker="Your Happiness Score" title={`${score} / 10`}>
            <div className="rounded-2xl border border-border bg-primary-soft p-5 text-center">
              <Heart className="mx-auto h-8 w-8 text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">
                This is a starting point — your plan will help this grow.
              </p>
            </div>
          </Slide>
        ) : null}

        {step === 12 ? (
          <Slide kicker="Today" title="How happy are you feeling today?">
            <ScalePicker
              value={ratings.todayHappiness}
              onChange={(n) => setRating('todayHappiness', n)}
            />
          </Slide>
        ) : null}

        {step === 13 ? (
          <Slide
            kicker="Happiness"
            title="Create your Daily / Weekly Plan"
            body="This is where the most important work begins. A simple weekly plan for Mind, Body, and Soul."
          >
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
              <Sun className="h-6 w-6 text-primary" />
              <p className="text-sm text-muted-foreground">We’ll take you there right after this.</p>
            </div>
          </Slide>
        ) : null}

        {step === 14 ? (
          <Slide kicker="Almost there" title="Add your email" body="We’ll use this for account recovery — not a noisy inbox.">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
              autoComplete="email"
            />
          </Slide>
        ) : null}

        {step === 15 ? (
          <Slide kicker="Profile" title="Your name">
            <div className="space-y-3">
              <Input
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-11"
                autoComplete="given-name"
              />
              <Input
                placeholder="Surname"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                className="h-11"
                autoComplete="family-name"
              />
            </div>
          </Slide>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      <Button
        className="mt-6 h-12 w-full rounded-xl text-base font-semibold"
        disabled={!canContinue() || saving}
        onClick={next}
      >
        {saving ? (
          'Saving…'
        ) : step === 12 ? (
          <>
            <Sparkles className="h-4 w-4" />
            Claim
          </>
        ) : step === TOTAL_STEPS - 1 ? (
          'Start my plan'
        ) : (
          'Continue'
        )}
      </Button>
    </div>
  );
}
