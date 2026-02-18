"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Loader2, X } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

interface InstallPwaButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function InstallPwaButton({
  variant = 'primary',
  size = 'default',
  onClick,
  children,
  ...props
}: InstallPwaButtonProps) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const updateInstalled = () => {
      const standalone =
        window.matchMedia?.('(display-mode: standalone)')?.matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(Boolean(standalone));
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      updateInstalled();
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
    };

    updateInstalled();
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || props.disabled) return;
    if (isInstalled) return;
    if (isPrompting) return;

    const ua = window.navigator.userAgent ?? '';
    const isAppleMobile =
      /iPad|iPhone|iPod/.test(ua) ||
      ((window.navigator as unknown as { platform?: string; maxTouchPoints?: number }).platform === 'MacIntel' &&
        ((window.navigator as unknown as { maxTouchPoints?: number }).maxTouchPoints ?? 0) > 1);

    if (!installPrompt) {
      if (isAppleMobile) setShowIosHelp(true);
      return;
    }

    setIsPrompting(true);
    await installPrompt.prompt();
    await installPrompt.userChoice.catch(() => null);
    setInstallPrompt(null);
    setIsPrompting(false);
  };

  return (
    <>
      <Button
        {...props}
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={props.disabled || isPrompting || isInstalled}
      >
        {isInstalled ? (
          'Instalada'
        ) : isPrompting ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Instalando...
          </span>
        ) : (
          children
        )}
      </Button>

      {showIosHelp ? (
        <div className="fixed inset-0 z-[60]">
          <button type="button" className="absolute inset-0 bg-black/70" aria-label="Cerrar" onClick={() => setShowIosHelp(false)} />
          <div className="absolute left-0 right-0 bottom-0 sm:inset-0 sm:m-auto sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl border-t border-zinc-100">
            <div className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-zinc-900">Instalar en iPhone/iPad</p>
                  <p className="text-sm text-zinc-500 mt-1">En iOS no aparece el botón de instalación automático.</p>
                </div>
                <button type="button" className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center" onClick={() => setShowIosHelp(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-zinc-200 p-4">
                  <p className="text-sm font-semibold text-zinc-900">Paso 1</p>
                  <p className="text-sm text-zinc-600 mt-1">Abre esta web en Safari.</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 p-4">
                  <p className="text-sm font-semibold text-zinc-900">Paso 2</p>
                  <p className="text-sm text-zinc-600 mt-1">Toca el botón Compartir.</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 p-4">
                  <p className="text-sm font-semibold text-zinc-900">Paso 3</p>
                  <p className="text-sm text-zinc-600 mt-1">Selecciona “Añadir a pantalla de inicio”.</p>
                </div>
              </div>

              <div className="mt-6">
                <Button className="w-full h-12 rounded-2xl bg-zinc-900 hover:bg-zinc-800" onClick={() => setShowIosHelp(false)}>
                  Entendido
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
