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
      <div className="flex w-full items-start">
        {STEPS.map((item, index) => {
          const isComplete = index < currentIndex;
          const isActive = index === currentIndex;
          const isLast = index === STEPS.length - 1;

          return (
            <div key={item.id} className="relative flex min-w-0 flex-1 flex-col items-center text-center">
              <div className="relative flex h-9 w-full items-center justify-center sm:h-10">
                {!isLast && (
                  <div
                    className={cn(
                      'absolute left-[calc(50%+1.125rem)] top-1/2 h-0.5 w-[calc(100%-2.25rem)] -translate-y-1/2 rounded-full sm:left-[calc(50%+1.25rem)] sm:w-[calc(100%-2.5rem)]',
                      currentIndex > index ? 'bg-primary' : 'bg-border'
                    )}
                    aria-hidden
                  />
                )}

                <div
                  className={cn(
                    'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors sm:h-10 sm:w-10 sm:text-sm',
                    isComplete && 'bg-primary text-primary-foreground',
                    isActive && 'bg-primary text-primary-foreground ring-4 ring-primary/15',
                    !isComplete && !isActive && 'bg-secondary text-muted-foreground'
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" strokeWidth={3} /> : index + 1}
                </div>
              </div>

              <p
                className={cn(
                  'mt-1.5 text-xs font-semibold sm:text-sm',
                  isActive || isComplete ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {item.label}
              </p>
              <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground sm:text-[11px]">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
