'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RegisterStep = 'phone' | 'details' | 'verify';

interface RegisterStepperProps {
  step: RegisterStep;
}

const STEPS = [
  { id: 'phone' as const, label: 'Phone', description: 'Your number' },
  { id: 'details' as const, label: 'Profile', description: 'About you' },
  { id: 'verify' as const, label: 'Verify', description: 'WhatsApp OTP' },
];

export default function RegisterStepper({ step }: RegisterStepperProps) {
  const currentIndex = STEPS.findIndex((item) => item.id === step);

  return (
    <div className="mb-5">
      <div className="flex items-start justify-center">
        {STEPS.map((item, index) => {
          const isComplete = index < currentIndex;
          const isActive = index === currentIndex;

          return (
            <div key={item.id} className="flex items-center">
              <div className="flex w-[5.5rem] flex-col items-center text-center sm:w-[6.5rem]">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-colors sm:h-10 sm:w-10 sm:text-sm',
                    isComplete && 'bg-primary text-primary-foreground',
                    isActive && 'bg-primary text-primary-foreground ring-4 ring-primary/15',
                    !isComplete && !isActive && 'bg-secondary text-muted-foreground'
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" strokeWidth={3} /> : index + 1}
                </div>
                <p
                  className={cn(
                    'mt-1.5 text-xs font-semibold sm:text-sm',
                    isActive || isComplete ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {item.label}
                </p>
                <p className="mt-0.5 hidden text-[10px] text-muted-foreground sm:block">
                  {item.description}
                </p>
              </div>

              {index < STEPS.length - 1 && (
                <div
                  className="mx-1 mt-[1.125rem] h-0.5 w-8 shrink-0 overflow-hidden rounded-full bg-border sm:mx-2 sm:w-14"
                  aria-hidden
                >
                  <div
                    className={cn(
                      'h-full rounded-full bg-primary transition-all duration-300',
                      currentIndex > index ? 'w-full' : 'w-0'
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
