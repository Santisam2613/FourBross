"use client";

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

type BackButtonProps = {
  className?: string;
  'aria-label'?: string;
};

export function BackButton({ className, ...props }: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      className={cn(className)}
      onClick={() => router.back()}
      {...props}
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}

