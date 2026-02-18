"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { isRoleCode, roleHomePath } from '@/types/roles';

export function PwaRootRedirect() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      const isStandalone =
        window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;

      if (!isStandalone) return;

      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/auth/login');
        return;
      }

      const { data: usuario } = await supabase.from('usuarios').select('rol').eq('id', user.id).single();
      const role = (usuario as unknown as { rol?: string | null } | null)?.rol ?? null;

      if (role === 'cliente') {
        router.replace('/client/branch-selection');
        return;
      }

      if (typeof role === 'string' && isRoleCode(role)) {
        router.replace(roleHomePath(role));
        return;
      }

      router.replace('/auth/login');
    };

    void run();
  }, [router]);

  return null;
}

