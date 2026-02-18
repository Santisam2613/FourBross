"use client";

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MobileAppLayout } from '@/components/layout/MobileAppLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ArrowLeft, Trash2, MapPin, Calendar, Clock, X, Minus, Plus, CheckCircle2 } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { createOrder } from '@/actions/orders';

type Product = {
  id: string;
  title: string;
  priceCents: number;
  desc: string;
  image: string | null;
};

type CartProduct = Product & { quantity: number };

type OrderDraft = {
  branchId: string;
  staffId: string;
  staffName: string;
  serviceId: string;
  serviceName: string;
  serviceImage?: string | null;
  servicePriceCents: number;
  startAt: string;
  endAt: string;
};

export default function CartPage() {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmSheetOpen, setConfirmSheetOpen] = useState(false);
  const [successSheetOpen, setSuccessSheetOpen] = useState(false);
  const [successTotal, setSuccessTotal] = useState(0);
  const [successOrdersCount, setSuccessOrdersCount] = useState(0);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [activeServiceKey, setActiveServiceKey] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  
  const [services, setServices] = useState<OrderDraft[]>([]);
  const [serviceProducts, setServiceProducts] = useState<Record<string, CartProduct[]>>({});
  const [productsOnly, setProductsOnly] = useState<CartProduct[]>([]);
  const [branchLabel, setBranchLabel] = useState<{ name: string; address: string } | null>(null);
  
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [submitting, startTransition] = useTransition();

  const getServiceKey = (s: OrderDraft) => `${s.serviceId}|${s.staffId}|${s.startAt}`;

  useEffect(() => {
    try {
      const oldDraft = window.localStorage.getItem('fourbross.orderDraft');
      const cartServicesRaw = window.localStorage.getItem('fourbross.cartServices');
      
      let loadedServices: OrderDraft[] = [];
      if (cartServicesRaw) {
        loadedServices = JSON.parse(cartServicesRaw);
      } else if (oldDraft) {
        loadedServices = [JSON.parse(oldDraft)];
        window.localStorage.removeItem('fourbross.orderDraft');
        window.localStorage.setItem('fourbross.cartServices', JSON.stringify(loadedServices));
      }
      setServices(loadedServices);

      const spRaw = window.localStorage.getItem('fourbross.cartServiceProducts');
      if (spRaw) {
        const parsed = JSON.parse(spRaw) as Record<string, CartProduct[]>;
        setServiceProducts(parsed ?? {});
      }

      const rawProducts = window.localStorage.getItem('fourbross.cartProducts');
      if (rawProducts) {
        const parsed = JSON.parse(rawProducts) as Array<{
          id: string;
          title: string;
          priceCents: number;
          desc: string;
          image: string | null;
          quantity?: number;
        }>;

        const byId = new Map<string, CartProduct>();
        for (const p of parsed ?? []) {
          const qty = Math.max(1, Number(p.quantity ?? 1));
          const existing = byId.get(p.id);
          if (existing) byId.set(p.id, { ...existing, quantity: existing.quantity + qty });
          else byId.set(p.id, { id: p.id, title: p.title, priceCents: p.priceCents, desc: p.desc, image: p.image, quantity: qty });
        }
        const next = Array.from(byId.values());
        setProductsOnly(next);
        window.localStorage.setItem('fourbross.cartProducts', JSON.stringify(next));
      }
    } catch {
    }
  }, []);

  const firstService = services[0];
  useEffect(() => {
    const run = async () => {
      if (firstService?.branchId) {
        setBranchId(firstService.branchId);
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('sucursal_id')
        .eq('id', user.id)
        .single();

      const selectedBranch = (usuario?.sucursal_id as string | null) ?? null;
      if (!selectedBranch) return;
      setBranchId(selectedBranch);
    };

    void run();
  }, [firstService?.branchId]);

  useEffect(() => {
    const run = async () => {
      if (!branchId) return;

      const supabase = createSupabaseBrowserClient();

      const { data: branch } = await supabase
        .from('sucursales')
        .select('nombre, direccion')
        .eq('id', branchId)
        .single();

      if (branch) {
        setBranchLabel({ name: (branch as any).nombre as string, address: (branch as any).direccion as string });
      }

      const { data: rows } = await supabase
        .from('productos')
        .select('id, titulo, descripcion, precio')
        .eq('sucursal_id', branchId)
        .eq('activo', true)
        .order('titulo', { ascending: true });

      const mapped = (rows ?? []).map((p: any) => ({
        id: p.id as string,
        title: p.titulo as string,
        priceCents: Number(p.precio ?? 0),
        desc: (p.descripcion as string | null) ?? '',
        image: null,
      }));

      setCatalog(mapped);
      setSelectedProductId(mapped[0]?.id ?? '');
    };

    void run();
  }, [branchId]);

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
  }, [selectedProductId, catalog]);

  const openAddProduct = (serviceKey: string) => {
    setActiveServiceKey(serviceKey);
    setSheetOpen(true);
  };

  const addProductToService = (serviceKey: string, productId: string) => {
    const p = catalog.find((x) => x.id === productId);
    if (!p) return;

    setServiceProducts((prev) => {
      const current = prev[serviceKey] ?? [];
      const existingIndex = current.findIndex((it) => it.id === productId);
      let nextServiceProducts: CartProduct[];

      if (existingIndex >= 0) {
        nextServiceProducts = current.map((it, i) =>
          i === existingIndex ? { ...it, quantity: it.quantity + 1 } : it
        );
      } else {
        nextServiceProducts = [...current, { ...p, quantity: 1 }];
      }

      const next = { ...prev, [serviceKey]: nextServiceProducts };
      try {
        window.localStorage.setItem('fourbross.cartServiceProducts', JSON.stringify(next));
      } catch {}
      return next;
    });

    setSheetOpen(false);
  };

  const addProductToCartOnly = (productId: string) => {
    const p = catalog.find((x) => x.id === productId);
    if (!p) return;

    setProductsOnly((prev) => {
      const existingIndex = prev.findIndex((it) => it.id === productId);
      let next: CartProduct[];
      if (existingIndex >= 0) {
        next = prev.map((it, i) => (i === existingIndex ? { ...it, quantity: it.quantity + 1 } : it));
      } else {
        next = [...prev, { ...p, quantity: 1 }];
      }
      try {
        window.localStorage.setItem('fourbross.cartProducts', JSON.stringify(next));
      } catch {}
      return next;
    });

    setSheetOpen(false);
  };

  const removeProductFromCartOnly = (productId: string) => {
    setProductsOnly((prev) => {
      const next = prev.filter((p) => p.id !== productId);
      try {
        window.localStorage.setItem('fourbross.cartProducts', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const changeCartOnlyQty = (productId: string, delta: number) => {
    setProductsOnly((prev) => {
      const next = prev.map((p) => {
        if (p.id !== productId) return p;
        return { ...p, quantity: Math.max(1, p.quantity + delta) };
      });
      try {
        window.localStorage.setItem('fourbross.cartProducts', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const removeProductFromService = (serviceKey: string, productId: string) => {
    setServiceProducts((prev) => {
      const current = prev[serviceKey] ?? [];
      const nextServiceProducts = current.filter((p) => p.id !== productId);
      const next = { ...prev, [serviceKey]: nextServiceProducts };
      try {
        window.localStorage.setItem('fourbross.cartServiceProducts', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const changeProductQty = (serviceKey: string, productId: string, delta: number) => {
    setServiceProducts((prev) => {
      const current = prev[serviceKey] ?? [];
      const nextServiceProducts = current.map((p) => {
        if (p.id !== productId) return p;
        const nextQty = Math.max(1, p.quantity + delta);
        return { ...p, quantity: nextQty };
      });
      const next = { ...prev, [serviceKey]: nextServiceProducts };
      try {
        window.localStorage.setItem('fourbross.cartServiceProducts', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const removeService = (index: number) => {
    const removed = services[index];
    const newServices = services.filter((_, i) => i !== index);
    setServices(newServices);
    try {
        window.localStorage.setItem('fourbross.cartServices', JSON.stringify(newServices));
    } catch {}

    if (removed) {
      const key = getServiceKey(removed);
      setServiceProducts((prev) => {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        try {
          window.localStorage.setItem('fourbross.cartServiceProducts', JSON.stringify(next));
        } catch {}
        return next;
      });
    }
  };

  const servicesSubtotal = services.reduce((sum, s) => sum + s.servicePriceCents, 0);
  const productsSubtotal = Object.values(serviceProducts).reduce((sum, list) => {
    return sum + list.reduce((acc, p) => acc + p.priceCents * p.quantity, 0);
  }, 0);
  const productsOnlySubtotal = productsOnly.reduce((sum, p) => sum + p.priceCents * p.quantity, 0);
  const subtotal = servicesSubtotal + productsSubtotal + productsOnlySubtotal;
  const formatMoney = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
  const formatTime12 = (iso: string) => {
    const d = new Date(iso);
    const h = d.getHours();
    const m = d.getMinutes();
    const period = h >= 12 ? 'pm' : 'am';
    const hours12 = h % 12 || 12;
    return `${hours12}:${String(m).padStart(2, '0')} ${period}`;
  };
  const ordersToCreateCount = services.length + (productsOnly.length > 0 ? 1 : 0);
  const canConfirm = ordersToCreateCount > 0 && (!!branchId || services.length > 0);

  const confirmOrder = () => {
    if (!canConfirm) return;
    setConfirmSheetOpen(false);
    setOrderError(null);
    
    startTransition(async () => {
      try {
        const createdOrderIds: string[] = [];

        if (services.length > 0) {
          for (let i = 0; i < services.length; i++) {
            const service = services[i];
            const key = getServiceKey(service);
            const itemsForService = serviceProducts[key] ?? [];

            const orderId = await createOrder({
              branchId: service.branchId,
              staffId: service.staffId,
              startAt: service.startAt,
              endAt: service.endAt,
              items: [
                { type: 'service', serviceId: service.serviceId, quantity: 1 },
                ...itemsForService.map((p) => ({ type: 'product' as const, productId: p.id, quantity: p.quantity })),
              ],
            });
            createdOrderIds.push(orderId);
          }
        }

        if (productsOnly.length > 0 && branchId) {
          const orderId = await createOrder({
            branchId,
            items: productsOnly.map((p) => ({ type: 'product' as const, productId: p.id, quantity: p.quantity })),
          });
          createdOrderIds.push(orderId);
        }

        try {
          window.localStorage.removeItem('fourbross.orderDraft');
          window.localStorage.removeItem('fourbross.cartServices');
          window.localStorage.removeItem('fourbross.cartProducts');
          window.localStorage.removeItem('fourbross.cartServiceProducts');
        } catch {
        }

          if (createdOrderIds.length > 0) {
            setServices([]);
            setServiceProducts({});
            setProductsOnly([]);
            setSuccessTotal(subtotal);
            setSuccessOrdersCount(createdOrderIds.length);
            setSuccessSheetOpen(true);
          }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'No se pudo crear la orden';
        setOrderError(message);
      }
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
        {orderError ? (
          <div className="bg-red-50 text-red-700 border border-red-100 rounded-2xl p-4 text-sm font-medium">
            {orderError}
          </div>
        ) : null}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">Servicios</h2>
            <Link href="/client/home" className="text-sm text-primary font-semibold">
              Agregar +
            </Link>
          </div>
          
          {services.length === 0 ? (
             <div className="m-4 text-center py-8 border-2 border-dashed border-zinc-200 rounded-2xl text-zinc-400 text-sm">
                No hay servicios seleccionados
             </div>
          ) : (
             services.map((svc, idx) => {
               const serviceKey = getServiceKey(svc);
               const assigned = serviceProducts[serviceKey] ?? [];

               return (
                 <div key={serviceKey} className="block w-full text-left">
                   <Card className="border-zinc-200 rounded-2xl overflow-hidden mb-3">
                     <CardContent className="p-4 space-y-4">
                       <div className="flex gap-4">
                         <div className="h-16 w-16 bg-zinc-100 rounded-xl overflow-hidden shrink-0">
                           <img
                             src={
                               svc.serviceImage ||
                               'https://images.unsplash.com/photo-1599351431202-6e0c06e76553?q=80&w=2056&auto=format&fit=crop'
                             }
                             alt={svc.serviceName}
                             className="h-full w-full object-cover"
                           />
                         </div>
                         <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-start gap-3">
                             <h3 className="font-semibold text-zinc-900 truncate">{svc.serviceName}</h3>
                             <span className="font-semibold text-zinc-900">{formatMoney(svc.servicePriceCents)}</span>
                           </div>
                           <p className="text-xs text-zinc-500 mt-1">{`Barbero: ${svc.staffName}`}</p>
                           <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                             <div className="flex items-center gap-1">
                               <Calendar className="h-3.5 w-3.5 text-primary" />
                               <span>{new Date(svc.startAt).toLocaleDateString('es-ES')}</span>
                             </div>
                             <div className="flex items-center gap-1">
                               <Clock className="h-3.5 w-3.5 text-primary" />
                               <span>
                                {formatTime12(svc.startAt)}
                               </span>
                             </div>
                           </div>
                         </div>
                         <button
                           type="button"
                           className="h-10 w-10 rounded-xl bg-zinc-100 text-red-600 flex items-center justify-center self-start"
                           aria-label="Eliminar servicio"
                           onClick={() => removeService(idx)}
                         >
                           <Trash2 className="h-4 w-4" />
                         </button>
                       </div>

                       <div className="rounded-2xl border border-zinc-200 bg-white p-3 space-y-3">
                         <div className="flex items-center justify-between">
                           <p className="text-sm font-semibold text-zinc-900">Productos</p>
                           <button
                             type="button"
                             className="text-sm text-primary font-semibold"
                             onClick={() => openAddProduct(serviceKey)}
                           >
                             Agregar +
                           </button>
                         </div>

                         {assigned.length === 0 ? (
                           <div className="text-xs text-zinc-400">Sin productos</div>
                         ) : (
                           <div className="space-y-2">
                             {assigned.map((p) => (
                               <div key={p.id} className="flex items-center gap-3">
                                 <div className="h-10 w-10 rounded-xl bg-zinc-100 overflow-hidden shrink-0">
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
                                   <p className="text-xs text-zinc-500 truncate">{`Unidad: ${formatMoney(p.priceCents)}`}</p>
                                   <div className="mt-2 flex items-center gap-2">
                                     <button
                                       type="button"
                                       onClick={() => changeProductQty(serviceKey, p.id, -1)}
                                       disabled={p.quantity <= 1}
                                       className="h-8 w-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center disabled:opacity-50 text-zinc-900"
                                       aria-label="Restar cantidad"
                                     >
                                       <Minus className="h-4 w-4" />
                                     </button>
                                     <span className="text-sm font-bold w-6 text-center">{p.quantity}</span>
                                     <button
                                       type="button"
                                       onClick={() => changeProductQty(serviceKey, p.id, 1)}
                                       className="h-8 w-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-900"
                                       aria-label="Sumar cantidad"
                                     >
                                       <Plus className="h-4 w-4" />
                                     </button>
                                   </div>
                                 </div>
                                 <div className="text-sm font-semibold text-zinc-900">{formatMoney(p.priceCents * p.quantity)}</div>
                                 <button
                                   type="button"
                                   className="h-9 w-9 rounded-xl bg-zinc-100 text-red-600 flex items-center justify-center"
                                   aria-label="Eliminar producto"
                                   onClick={() => removeProductFromService(serviceKey, p.id)}
                                 >
                                   <Trash2 className="h-4 w-4" />
                                 </button>
                               </div>
                             ))}
                           </div>
                         )}
                       </div>
                     </CardContent>
                   </Card>
                 </div>
               );
             })
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">
              {services.length > 0 ? 'Productos (sin servicio)' : 'Productos'}
            </h2>
            <button
              type="button"
              className="text-sm text-primary font-semibold"
              onClick={() => {
                setActiveServiceKey(null);
                setSheetOpen(true);
              }}
            >
              Agregar +
            </button>
          </div>

          <Card className="border-zinc-200 rounded-2xl">
            <CardContent className="p-0">
              {productsOnly.length === 0 ? (
                <div className="m-4 text-center py-10 border-2 border-dashed border-zinc-200 rounded-2xl text-zinc-400 text-sm">
                  No has agregado productos
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {productsOnly.map((p) => (
                    <div key={p.id} className="flex items-center gap-3">
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
                        <p className="text-xs text-zinc-500 truncate">{`Unidad: ${formatMoney(p.priceCents)}`}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => changeCartOnlyQty(p.id, -1)}
                            disabled={p.quantity <= 1}
                            className="h-8 w-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center disabled:opacity-50 text-zinc-900"
                            aria-label="Restar cantidad"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="text-sm font-bold w-6 text-center">{p.quantity}</span>
                          <button
                            type="button"
                            onClick={() => changeCartOnlyQty(p.id, 1)}
                            className="h-8 w-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-900"
                            aria-label="Sumar cantidad"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-zinc-900">{formatMoney(p.priceCents * p.quantity)}</div>
                      <button
                        type="button"
                        className="h-9 w-9 rounded-xl bg-zinc-100 text-red-600 flex items-center justify-center"
                        aria-label="Eliminar producto"
                        onClick={() => removeProductFromCartOnly(p.id)}
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
            disabled={submitting || !canConfirm}
            onClick={() => setConfirmSheetOpen(true)}
          >
            Confirmar Orden
          </Button>
        </div>
      </div>

      {confirmSheetOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Cerrar"
            onClick={() => setConfirmSheetOpen(false)}
          />
          <div className="absolute left-0 right-0 bottom-0 md:max-w-[430px] md:mx-auto bg-white rounded-t-3xl border-t border-zinc-100">
            <div className="px-6 pt-5 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-zinc-900">¿Confirmar orden?</p>
                  <p className="text-sm text-zinc-500 mt-1">{`Se crearán ${ordersToCreateCount} orden(es).`}</p>
                </div>
                <button
                  type="button"
                  className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700"
                  aria-label="Cerrar"
                  onClick={() => setConfirmSheetOpen(false)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 flex items-center justify-between">
                <span className="text-sm text-zinc-500">Total</span>
                <span className="text-lg font-bold text-zinc-900">{formatMoney(subtotal)}</span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Button variant="outline" className="rounded-full" onClick={() => setConfirmSheetOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  className="rounded-full bg-zinc-900 hover:bg-zinc-800"
                  disabled={submitting}
                  onClick={confirmOrder}
                >
                  Sí, confirmar
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {successSheetOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Cerrar"
            onClick={() => setSuccessSheetOpen(false)}
          />
          <div className="absolute left-0 right-0 bottom-0 md:max-w-[430px] md:mx-auto bg-white rounded-t-3xl border-t border-zinc-100">
            <div className="px-6 pt-7 pb-6">
              <div className="flex flex-col items-center text-center">
                <div className="h-14 w-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <p className="mt-4 text-xl font-semibold text-zinc-900">Orden realizada con éxito</p>
                <p className="mt-1 text-sm text-zinc-500">{`Gracias. Se crearon ${successOrdersCount} orden(es).`}</p>
                <div className="mt-4 w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-4 flex items-center justify-between">
                  <span className="text-sm text-zinc-500">Total</span>
                  <span className="text-lg font-bold text-zinc-900">{formatMoney(successTotal)}</span>
                </div>
                <div className="mt-5 w-full">
                  <Button
                    className="w-full rounded-full bg-zinc-900 hover:bg-zinc-800"
                    onClick={() => router.push('/client/orders')}
                  >
                    Gracias
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
                    <p className="text-xs text-primary font-semibold">{formatMoney(p.priceCents)}</p>
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
                      {formatMoney(selectedProduct.priceCents)}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <Link href={`/client/products/${selectedProduct.id}`} className="flex-1">
                      <Button variant="outline" className="w-full rounded-full">
                        Ver detalle
                      </Button>
                    </Link>
                    <Button
                      className="flex-1 rounded-full bg-zinc-900 hover:bg-zinc-800"
                      disabled={!selectedProduct.id}
                      onClick={() => {
                        if (activeServiceKey) addProductToService(activeServiceKey, selectedProduct.id);
                        else addProductToCartOnly(selectedProduct.id);
                      }}
                    >
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
