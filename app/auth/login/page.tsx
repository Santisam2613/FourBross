"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MobileAppLayout } from '@/components/layout/MobileAppLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { isRoleCode, roleHomePath } from '@/types/roles';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error || !data.user) return;

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
      const role = profile?.role;
      if (typeof role === 'string' && isRoleCode(role)) {
        router.push(roleHomePath(role));
      } else {
        router.push('/client/home');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MobileAppLayout outerClassName="bg-black" className="bg-black">
      <div className="px-6 pt-8 pb-6 flex items-center justify-center relative">
        <Link
          href="/"
          className="absolute left-6 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full border border-white/20 flex items-center justify-center text-white"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-white text-4xl font-semibold tracking-tight">Iniciar sección</h1>
      </div>

      <div className="bg-white rounded-t-[56px] flex-1 px-7 pt-10 pb-10">
        <div className="flex flex-col items-center text-center">
          <img src="/assets/splsh_app.png" alt="FourBross" className="h-40 w-auto" />
          <p className="mt-2 text-[11px] tracking-[0.2em] text-primary uppercase">
            Donde el estilo cobra vida
          </p>
        </div>

        <form className="mt-10 space-y-5" onSubmit={onSubmit}>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
            <Input
              id="email"
              type="email"
              placeholder="Correo"
              className="h-14 rounded-2xl border-0 bg-zinc-100 pl-12 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-primary"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Contraseña"
              className="h-14 rounded-2xl border-0 bg-zinc-100 pl-12 pr-12 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-primary"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          <Button
            type="submit"
            className="w-full h-14 rounded-full text-base font-semibold"
            disabled={submitting}
          >
            Iniciar
          </Button>

          <div className="text-center">
            <Link href="/auth/register" className="text-sm text-zinc-500">
              Crear cuenta
            </Link>
          </div>

          <div className="pt-4 text-center text-sm text-zinc-500">
            <span>¿Olvidaste la contraseña? </span>
            <Link href="/auth/reset-password" className="text-primary font-semibold">
              Restablecer aqui
            </Link>
          </div>
        </form>
      </div>
    </MobileAppLayout>
  );
}
