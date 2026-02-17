"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { BarChart3, Users, ReceiptText } from 'lucide-react';

const navItems = [
  { href: '/commercial/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/commercial/clients', label: 'Clientes', icon: Users },
  { href: '/commercial/orders', label: 'Órdenes', icon: ReceiptText },
] as const;

export default function CommercialLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-7xl min-h-screen md:flex">
        <aside className="hidden md:flex md:w-72 md:flex-col md:gap-6 md:bg-black md:text-white md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/70">FourBross</p>
              <p className="text-lg font-semibold tracking-tight">CRM Comercial</p>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors',
                    active ? 'bg-primary text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 p-6 md:p-10">{children}</main>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 md:hidden">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-around">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className={cn('flex flex-col items-center gap-1', active ? 'text-primary' : 'text-zinc-600')}>
                  <Icon className="h-5 w-5" />
                  <span className="text-[11px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

