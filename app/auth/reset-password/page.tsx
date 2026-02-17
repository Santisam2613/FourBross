"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MobileAppLayout } from '@/components/layout/MobileAppLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Mail } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) return;
      router.push('/auth/login');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MobileAppLayout outerClassName="bg-black" className="bg-black">
      <div className="px-6 pt-8 pb-6 flex items-center justify-center relative">
        <Link
          href="/auth/login"
          className="absolute left-6 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full border border-white/20 flex items-center justify-center text-white"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-white text-2xl font-semibold tracking-tight">¿Olvidaste la contraseña?</h1>
      </div>

      <div className="bg-white rounded-t-[56px] flex-1 px-7 pt-10 pb-10">
        <div className="flex flex-col items-center text-center">
          <img src="/assets/splsh_app.png" alt="FourBross" className="h-40 w-auto" />
          <p className="mt-2 text-[11px] tracking-[0.2em] text-primary uppercase">
            Donde el estilo cobra vida
          </p>
        </div>

        <form className="mt-10 space-y-6" onSubmit={onSubmit}>
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

          <Button className="w-full h-14 rounded-full text-base font-semibold" disabled={submitting}>
            Enviar
          </Button>
        </form>
      </div>
    </MobileAppLayout>
  );
}
