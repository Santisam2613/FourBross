import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { InstallPwaButton } from '@/components/ui/InstallPwaButton';
import { PwaRootRedirect } from '@/components/ui/PwaRootRedirect';
import { Scissors, Gift, Calendar, Play, Check, Star } from 'lucide-react';

export default function Homepage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans pb-24">
      <PwaRootRedirect />
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-zinc-900">
        <div className="mx-auto w-full max-w-6xl h-16 px-6 lg:px-12 flex items-center gap-6">
          <Link href="/" className="shrink-0 flex items-center">
            <img
              src="/assets/logoheaders.png"
              alt="FourBross"
              className="h-6 w-auto"
            />
          </Link>

          <div className="hidden md:flex flex-1 items-center justify-center gap-10 text-sm">
            <a href="#" className="text-primary font-medium">
              Inicio
            </a>
            <a
              href="#servicios"
              className="text-zinc-300 hover:text-white transition-colors"
            >
              Servicios
            </a>
            <a
              href="#testimonios"
              className="text-zinc-300 hover:text-white transition-colors"
            >
              Testimonios
            </a>
            <a
              href="https://api.whatsapp.com/send/?phone=573212834621&text&type=phone_number&app_absent=0"
              target="_blank"
              rel="noreferrer"
              className="text-zinc-300 hover:text-white transition-colors"
            >
              Contactar
            </a>
          </div>

          <div className="ml-auto md:ml-0 shrink-0">
            <InstallPwaButton
              variant="outline"
              size="sm"
              className="rounded-full border-zinc-700 bg-transparent text-zinc-100 hover:bg-white/10 hover:text-white"
            >
              Descargar App
            </InstallPwaButton>
          </div>
        </div>
      </nav>

      <header className="relative mt-16 overflow-hidden bg-black text-white">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=2074&auto=format&fit=crop')] bg-cover bg-center opacity-35" />
          <div className="absolute inset-0 bg-black/70" />
          <svg
            className="absolute inset-0 h-full w-full opacity-[0.12]"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
                <path d="M 8 0 L 0 0 0 8" fill="none" stroke="white" strokeWidth="0.35" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
          <div className="absolute left-0 top-0 h-full w-[2px] bg-primary/70" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-16 md:py-24">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs tracking-[0.25em] uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Barbería de lujo
            </div>

            <h1 className="mt-6 text-5xl md:text-7xl font-bold tracking-tight leading-[1.02]">
              Estilo preciso.
              <span className="block text-primary">Presencia absoluta.</span>
            </h1>

            <p className="mt-6 text-lg md:text-xl text-zinc-200 font-light leading-relaxed">
              Una experiencia premium para caballeros: ritual, detalle y consistencia.
              Instala la PWA y gestiona tu visita en segundos.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3 sm:items-center">
              <InstallPwaButton size="lg" className="h-12 px-8 text-base rounded-full">
                Instalar la App
              </InstallPwaButton>
              <a href="#beneficios">
                <Button size="lg" variant="outline" className="h-12 px-8 text-base rounded-full border-white/25 bg-transparent text-white">
                  Ver beneficios
                </Button>
              </a>
            </div>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs tracking-[0.2em] uppercase text-zinc-300">Fidelidad</span>
                  <Gift className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-2 text-sm text-zinc-200">10 servicios = 1 gratis</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs tracking-[0.2em] uppercase text-zinc-300">Sorteo</span>
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-2 text-sm text-zinc-200">Cada 28 del mes</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs tracking-[0.2em] uppercase text-zinc-300">Calidad</span>
                  <Star className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-2 text-sm text-zinc-200">4.9/5 en experiencia</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section id="servicios" className="py-20 px-6 max-w-6xl mx-auto">
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div className="space-y-2">
              <p className="text-primary text-xs font-semibold tracking-[0.25em] uppercase">Experiencia Premium</p>
              <h2 className="text-3xl md:text-4xl font-bold">Servicios destacados</h2>
            </div>
            <InstallPwaButton variant="outline" className="rounded-full">
              Instalar y reservar
            </InstallPwaButton>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: 'Corte Clásico', price: '$250 MXN', desc: 'Precisión, proporción y acabado limpio.' },
              { title: 'Barba Premium', price: '$200 MXN', desc: 'Toalla caliente, navaja y aceites premium.' },
              { title: 'Ritual FourBross', price: '$400 MXN', desc: 'Corte + barba + masaje facial (experiencia total).' },
            ].map((service, idx) => (
              <Card key={idx} className="group cursor-pointer border-zinc-200 hover:border-zinc-900 transition-colors">
                <CardContent className="p-8 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-full border border-zinc-200 flex items-center justify-center group-hover:border-primary transition-colors">
                      <Scissors className="h-5 w-5 text-zinc-900 group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-sm font-bold text-primary">{service.price}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{service.title}</h3>
                    <p className="mt-2 text-zinc-500 leading-relaxed">{service.desc}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs tracking-[0.2em] uppercase text-zinc-500">Duración</span>
                    <span className="text-xs font-semibold text-zinc-900">30–90 min</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="beneficios" className="bg-zinc-50 py-20 px-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-2">
                <p className="text-primary text-xs font-semibold tracking-[0.25em] uppercase">Club FourBross</p>
                <h2 className="text-3xl md:text-4xl font-bold">Un club exclusivo, diseñado para repetirse.</h2>
                <p className="text-zinc-500 leading-relaxed">
                  Beneficios reales, estética sobria y una experiencia pensada para que vuelvas.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[ 
                  { title: 'Fidelidad automática', desc: 'Tu progreso siempre visible (10 = 1 gratis).' },
                  { title: 'Sorteo mensual', desc: 'Participación automática cada día 28.' },
                  { title: 'Equipo premium', desc: 'Barberos verificados y consistencia en cada visita.' },
                  { title: 'Agenda rápida', desc: 'Selecciona barbero, fecha y hora en segundos.' },
                ].map((b, i) => (
                  <div key={i} className="rounded-xl border border-zinc-200 bg-white p-5">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary" />
                      </div>
                      <h3 className="font-bold">{b.title}</h3>
                    </div>
                    <p className="mt-2 text-sm text-zinc-500 leading-relaxed">{b.desc}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <InstallPwaButton size="lg" className="h-12 rounded-full">
                  Instalar la App
                </InstallPwaButton>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-2xl overflow-hidden border border-zinc-200 bg-white shadow-sm">
                <div className="aspect-[4/5] bg-zinc-200 relative">
                  <img
                    src="https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=2070&auto=format&fit=crop"
                    alt="FourBross"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
                <div className="p-6 border-t border-zinc-100">
                  <p className="text-xs tracking-[0.25em] uppercase text-zinc-500">Instalación PWA</p>
                  <p className="mt-2 text-sm text-zinc-700 leading-relaxed">
                    Agrega FourBross a tu pantalla de inicio para una experiencia tipo app.
                  </p>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full border border-primary/30" />
              <div className="absolute -top-6 -right-6 h-28 w-28 rounded-full border border-zinc-300" />
            </div>
          </div>
        </section>

        <section className="py-20 px-6 max-w-6xl mx-auto">
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div className="space-y-2">
              <p className="text-primary text-xs font-semibold tracking-[0.25em] uppercase">Galería</p>
              <h2 className="text-3xl font-bold">Detalles premium</h2>
            </div>
            <p className="text-sm text-zinc-500 max-w-xl">
              Materiales, iluminación y ejecución. Todo pensado para una estética sobria y masculina.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              'https://images.unsplash.com/photo-1517832207067-4db24a2ae47c?q=80&w=1974&auto=format&fit=crop',
              'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1974&auto=format&fit=crop',
              'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=1974&auto=format&fit=crop',
              'https://images.unsplash.com/photo-1583001931096-959e9a1a1a22?q=80&w=1974&auto=format&fit=crop',
              'https://images.unsplash.com/photo-1520975958225-4b4b2a4b0b2a?q=80&w=1974&auto=format&fit=crop',
              'https://images.unsplash.com/photo-1519666213638-8b61c9f1d144?q=80&w=1974&auto=format&fit=crop',
            ].map((src, i) => (
              <div key={i} className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 aspect-[4/3]">
                <img src={src} alt="Galería FourBross" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />
              </div>
            ))}
          </div>
        </section>

        <section id="testimonios" className="py-20 px-6 max-w-6xl mx-auto">
          <div className="text-center mb-14 space-y-2">
            <p className="text-primary text-xs font-semibold tracking-[0.25em] uppercase">Testimonios</p>
            <h2 className="text-3xl font-bold">Lo que se siente, se nota</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[
              { quote: 'Precisión y trato impecable. Se volvió mi lugar fijo.', name: 'Cliente Gold' },
              { quote: 'Ambiente premium y resultados consistentes.', name: 'Cliente Frecuente' },
              { quote: 'La experiencia completa vale cada minuto.', name: 'Miembro Club' },
            ].map((t, i) => (
              <div
                key={i}
                className="relative aspect-[9/16] bg-black rounded-xl overflow-hidden group cursor-pointer border border-white/10"
              >
                <div className="absolute inset-0 bg-zinc-900 opacity-55 group-hover:opacity-45 transition-opacity" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-16 w-16 rounded-full border border-white/20 bg-white/5 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Play className="h-6 w-6 text-white fill-white ml-1" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-black/70 text-white">
                  <p className="font-medium leading-relaxed">“{t.quote}”</p>
                  <p className="text-sm text-zinc-300 mt-2">{t.name}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-zinc-200 md:hidden z-50">
        <div className="mx-auto w-full max-w-md">
          <InstallPwaButton size="lg" className="w-full shadow-sm text-base h-12 rounded-full">
            Instalar y agendar
          </InstallPwaButton>
        </div>
      </div>

      <footer className="bg-zinc-900 text-zinc-400 py-14 px-6 text-center text-sm">
        <div className="max-w-2xl mx-auto">
          <p>&copy; {new Date().getFullYear()} FourBross Barbería. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
