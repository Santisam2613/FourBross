"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Menu, X, LayoutDashboard, Users, ShoppingBag, DollarSign, Package, UserCheck, Briefcase, LogOut } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: 'admin' | 'comercial';
}

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  type UserProfileRow = { nombre: string | null; correo: string | null };

  const adminLinks: SidebarItem[] = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Inventario', href: '/admin/inventory', icon: Package },
    { label: 'Nómina', href: '/admin/payroll', icon: UserCheck },
    { label: 'Gastos', href: '/admin/expenses', icon: DollarSign },
    { label: 'Socios', href: '/admin/partners', icon: Briefcase },
  ];

  const commercialLinks: SidebarItem[] = [
    { label: 'Dashboard', href: '/commercial/dashboard', icon: LayoutDashboard },
    { label: 'Clientes', href: '/commercial/clients', icon: Users },
    { label: 'Órdenes', href: '/commercial/orders', icon: ShoppingBag },
  ];

  const links = role === 'admin' ? adminLinks : commercialLinks;

  useEffect(() => {
    const run = async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email ?? '');

      const { data } = await supabase.from('usuarios').select('nombre, correo').eq('id', user.id).single();
      const profile = data as UserProfileRow | null;
      const name = String(profile?.nombre ?? '').trim();
      const correo = String(profile?.correo ?? '').trim();
      setUserName(name);
      if (correo) setUserEmail(correo);
    };
    void run();
  }, []);

  const initials = userName
    ? userName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('')
    : role === 'admin'
      ? 'AD'
      : 'CM';

  const signOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed md:static inset-y-0 left-0 z-50 w-72 bg-black text-white border-r border-white/10 transform transition-transform duration-200 ease-in-out md:transform-none",
          isSidebarOpen ? "translate-x-0 md:translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <img
              src="/assets/logoheaders.png"
              alt="FourBross"
              className="h-8 w-auto"
            />
          </Link>
          <button 
            className="ml-auto md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {links.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-colors",
                  isActive 
                    ? "bg-primary text-white" 
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                )}
                onClick={() => setIsSidebarOpen(false)}
              >
                <link.icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        
        <div className="absolute bottom-4 left-0 right-0 px-4">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{userName || (role === 'admin' ? 'Administrador' : 'Comercial')}</p>
                <p className="text-xs text-white/60 truncate">{userEmail}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="w-full h-11 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8">
          <button 
            className="p-2 -ml-2 md:hidden text-gray-600"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-4 ml-auto">
             {/* Mock Header Actions */}
             <div className="text-sm text-gray-500">
                {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
             </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
