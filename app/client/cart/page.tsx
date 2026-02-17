"use client";

import React, { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MobileAppLayout } from '@/components/layout/MobileAppLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ArrowLeft, Trash2, MapPin, Calendar, Clock, X } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { createOrder } from '@/actions/orders';

type Product = {
  id: string;
  title: string;
  priceCents: number;
  desc: string;
  image: string | null;
};

type OrderDraft = {
  branchId: string;
  staffId: string;
  staffName: string;
  serviceId: string;
  serviceName: string;
  servicePriceCents: number;
  startAt: string;
  endAt: string;
};

export default function CartPage() {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [draft, setDraft] = useState<OrderDraft | null>(null);
  const [branchLabel, setBranchLabel] = useState<{ name: string; address: string } | null>(null);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [submitting, startTransition] = useTransition();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('fourbross.orderDraft');
      if (!raw) return;
      setDraft(JSON.parse(raw) as OrderDraft);
    } catch {
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!draft?.branchId) return;
      const supabase = createSupabaseBrowserClient();

      const { data: branch } = await supabase
        .from('branches')
        .select('name, address')
        .eq('id', draft.branchId)
        .single();

      if (branch) {
        setBranchLabel({ name: branch.name as string, address: branch.address as string });
      }

      const { data: rows } = await supabase
        .from('products')
        .select('id, name, description, price_cents')
        .eq('branch_id', draft.branchId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name', { ascending: true });

      const mapped = (rows ?? []).map((p: any) => ({
        id: p.id as string,
        title: p.name as string,
        priceCents: (p.price_cents as number) ?? 0,
        desc: (p.description as string | null) ?? '',
        image: null,
      }));

      setCatalog(mapped);
      setSelectedProductId(mapped[0]?.id ?? '');
    };

    void run();
  }, [draft?.branchId]);

  const selectedProduct = useMemo(() => {
    return (
      catalog.find((p) => p.id === selectedProductId) ||
      catalog[0] || {
        id: '',
        title: '',
        priceCents: 0,
        desc: '',
        image: null,
      }
    );
  }, [selectedProductId]);

  const addProduct = (id: string) => {
    const p = catalog.find((x) => x.id === id);
    if (!p) return;
    setProducts((prev) => [...prev, p]);
    setSheetOpen(false);
  };

  const removeProduct = (index: number) => {
    setProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const serviceSubtotal = (draft?.servicePriceCents ?? 0) / 100;
  const productsSubtotal = products.reduce((sum, p) => sum + p.priceCents / 100, 0);
  const subtotal = serviceSubtotal + productsSubtotal;
  const formatMoney = (n: number) => `$${n.toFixed(2)}`;

  const confirmOrder = () => {
    if (!draft) return;
    startTransition(async () => {
      const orderId = await createOrder({
        branchId: draft.branchId,
        staffId: draft.staffId,
        startAt: draft.startAt,
        endAt: draft.endAt,
        items: [
          { type: 'service', serviceId: draft.serviceId, quantity: 1 },
          ...products.map((p) => ({ type: 'product' as const, productId: p.id, quantity: 1 })),
        ],
      });

      try {
        window.localStorage.removeItem('fourbross.orderDraft');
      } catch {
      }

      router.push(`/client/orders/${orderId}`);
    });
  };

  return (
    <MobileAppLayout outerClassName="bg-black" className="bg-zinc-50">
      <header className="bg-primary text-white">
        <div className="px-6 pt-6 pb-5 flex items-center justify-center relative">
          <Link
            href="/client/home"
            className="absolute left-6 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full border border-white/30 flex items-center justify-center text-white"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">Resumen de Orden</h1>
        </div>
      </header>

      <div className="bg-zinc-50 px-6 pt-6 pb-40 space-y-6">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900">Servicios</h2>
          <button
            type="button"
            className="block w-full text-left"
            onClick={() => router.push('/client/service-detail')}
          >
            <Card className="border-zinc-200 rounded-2xl overflow-hidden">
              <CardContent className="p-4 flex gap-4">
              <div className="h-16 w-16 bg-zinc-100 rounded-xl overflow-hidden shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1599351431202-6e0c06e76553?q=80&w=2056&auto=format&fit=crop"
                  alt="Corte Clásico"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-3">
                  <h3 className="font-semibold text-zinc-900 truncate">Corte Clásico</h3>
                  <span className="font-semibold text-zinc-900">{formatMoney(serviceSubtotal)}</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">{`Barbero: ${draft?.staffName ?? ''}`}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span>{draft ? new Date(draft.startAt).toLocaleDateString('es-ES') : ''}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span>
                      {draft ? new Date(draft.startAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="h-10 w-10 rounded-xl bg-zinc-100 text-red-600 flex items-center justify-center self-center"
                aria-label="Eliminar servicio"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              </CardContent>
            </Card>
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">Productos</h2>
            <button type="button" className="text-sm text-primary font-semibold" onClick={() => setSheetOpen(true)}>
              Agregar +
            </button>
          </div>

          <Card className="border-zinc-200 rounded-2xl">
            <CardContent className="p-0">
              {products.length === 0 ? (
                <div className="m-4 text-center py-10 border-2 border-dashed border-zinc-200 rounded-2xl text-zinc-400 text-sm">
                  No has agregado productos
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {products.map((p, idx) => (
                    <div key={`${p.id}-${idx}`} className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-zinc-100 overflow-hidden shrink-0">
                        <img
                          src={
                            p.image ??
                            'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=1600&auto=format&fit=crop'
                          }
                          alt={p.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-zinc-900 truncate">{p.title}</p>
                        <p className="text-xs text-zinc-500 truncate">{p.desc}</p>
                      </div>
                      <div className="text-sm font-semibold text-zinc-900">{formatMoney(p.priceCents / 100)}</div>
                      <button
                        type="button"
                        className="h-9 w-9 rounded-xl bg-zinc-100 text-red-600 flex items-center justify-center"
                        aria-label="Eliminar producto"
                        onClick={() => removeProduct(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900">Ubicación</h2>
          <Card className="border-zinc-200 rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center text-primary">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-zinc-900">{branchLabel?.name ?? ''}</p>
                <p className="text-xs text-zinc-500 truncate">{branchLabel?.address ?? ''}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900">Método de Pago</h2>
          <Card className="border-zinc-200 rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-4 w-4 rounded-full border-2 border-primary bg-primary" />
              <span className="text-sm font-medium text-zinc-900">Pagar en sucursal</span>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 md:max-w-[430px] md:mx-auto">
        <div className="p-4 space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-500">Subtotal</span>
            <span className="font-medium text-zinc-900">{formatMoney(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center text-lg font-bold">
            <span className="text-zinc-900">Total</span>
            <span className="text-zinc-900">{formatMoney(subtotal)}</span>
          </div>
          <Button
            className="w-full text-base h-12 shadow-sm bg-zinc-900 hover:bg-zinc-800 rounded-full"
            disabled={submitting || !draft}
            onClick={confirmOrder}
          >
            Confirmar Orden
          </Button>
        </div>
      </div>

      {sheetOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Cerrar"
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute left-0 right-0 bottom-0 md:max-w-[430px] md:mx-auto bg-white rounded-t-3xl border-t border-zinc-100">
            <div className="px-6 pt-4 pb-3 flex items-center justify-between">
              <div>
                <p className="font-semibold text-zinc-900">Agregar productos</p>
                <p className="text-xs text-zinc-500">Elige un producto para ver detalles y agregarlo.</p>
              </div>
              <button
                type="button"
                className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700"
                aria-label="Cerrar"
                onClick={() => setSheetOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 pb-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {catalog.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`rounded-2xl border p-3 text-left ${
                      selectedProductId === p.id ? 'border-primary bg-primary/5' : 'border-zinc-200 bg-white'
                    }`}
                    onClick={() => setSelectedProductId(p.id)}
                  >
                    <div className="h-16 w-full rounded-xl bg-zinc-100 overflow-hidden">
                      <img
                        src={
                          p.image ??
                          'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=1600&auto=format&fit=crop'
                        }
                        alt={p.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-zinc-900 truncate">{p.title}</p>
                    <p className="text-xs text-primary font-semibold">{formatMoney(p.priceCents / 100)}</p>
                  </button>
                ))}
              </div>

              <Card className="border-zinc-200 rounded-2xl overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-900 truncate">{selectedProduct.title}</p>
                      <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{selectedProduct.desc}</p>
                    </div>
                    <div className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-white text-xs font-semibold">
                      {formatMoney(selectedProduct.priceCents / 100)}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <Link href={`/client/products/${selectedProduct.id}`} className="flex-1">
                      <Button variant="outline" className="w-full rounded-full">
                        Ver detalle
                      </Button>
                    </Link>
                    <Button className="flex-1 rounded-full bg-zinc-900 hover:bg-zinc-800" onClick={() => addProduct(selectedProduct.id)}>
                      Agregar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : null}
    </MobileAppLayout>
  );
}
