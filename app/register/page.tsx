'use client';

import { useState, Suspense } from 'react';
import RegisterForm from '@/components/auth/RegisterForm';
import LoadingScreen from '@/components/ui/LoadingScreen';

export default function RegisterPage() {
  return (
    <Suspense fallback={<LoadingScreen fullScreen label="Loading registration…" />}>
      <RegisterForm />
    </Suspense>
  );
}
