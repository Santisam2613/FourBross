"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Menu, X, Scissors, LayoutDashboard, Users, ShoppingBag, DollarSign, Package, UserCheck, Briefcase } from 'lucide-react';

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: 'admin' | 'commercial';
}

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

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

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:transform-none",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <Link href="/" className="flex items-center gap-2">
            <Scissors className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl tracking-tight">FourBross</span>
          </Link>
          <button 
            className="ml-auto lg:hidden"
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
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
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
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 border border-gray-100">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                    {role === 'admin' ? 'AD' : 'CM'}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                        {role === 'admin' ? 'Administrador' : 'Comercial'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                        {role === 'admin' ? 'admin@fourbross.com' : 'sales@fourbross.com'}
                    </p>
                </div>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8">
          <button 
            className="p-2 -ml-2 lg:hidden text-gray-600"
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

        <main className="flex-1 overflow-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
