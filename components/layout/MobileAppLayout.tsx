import React from 'react';
import { cn } from '@/lib/utils';

interface MobileAppLayoutProps {
  children: React.ReactNode;
  outerClassName?: string;
  className?: string;
  showNav?: boolean; // Can be used to conditionally render bottom nav if needed
}

export function MobileAppLayout({ children, outerClassName, className }: MobileAppLayoutProps) {
  return (
    <div className={cn("min-h-screen w-full bg-zinc-100 flex justify-center items-start", outerClassName)}>
      <div 
        className={cn(
          "w-full max-w-[430px] min-h-screen bg-white shadow-2xl overflow-hidden relative flex flex-col",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
