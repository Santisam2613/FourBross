"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { MobileAppLayout } from '@/components/layout/MobileAppLayout';
import { Button } from '@/components/ui/Button';
import { ShoppingCart, Plus, Minus, Loader2 } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Product = {
  id: string;
  title: string;
  price: number;
  desc: string;
  image: string;
  stock: number;
};

type CartProduct = {
  id: string;
  title: string;
  priceCents: number;
  desc: string;
  image: string | null;
  quantity: number;
};

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!params?.id) return;
      
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from('productos')
        .select('*')
        .eq('id', params.id)
        .single();

      if (data) {
        setProduct({
          id: data.id,
          title: data.titulo,
          price: Number(data.precio),
          desc: data.descripcion,
          image: data.imagen,
          stock: data.stock
        });
      }
      setLoading(false);
    };

    fetchProduct();
  }, [params?.id]);

  const addProduct = () => {
    if (!product) return;

    try {
      const rawProducts = window.localStorage.getItem('fourbross.cartProducts');
      const currentProducts: CartProduct[] = rawProducts ? JSON.parse(rawProducts) : [];

      const existingProductIndex = currentProducts.findIndex((p: any) => p.id === product.id);

      if (existingProductIndex >= 0) {
        const nextQty = Math.min(
          product.stock,
          (currentProducts[existingProductIndex].quantity || 1) + quantity
        );
        currentProducts[existingProductIndex].quantity = nextQty;
      } else {
        currentProducts.push({
          id: product.id,
          title: product.title,
          priceCents: product.price,
          desc: product.desc,
          image: product.image,
          quantity: Math.min(product.stock, quantity)
        });
      }

      window.localStorage.setItem('fourbross.cartProducts', JSON.stringify(currentProducts));
      router.push('/client/cart');
    } catch (e) {
      console.error(e);
    }
  };

  const incrementQuantity = () => {
    if (product && quantity < product.stock) {
      setQuantity(q => q + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(q => q - 1);
    }
  };

  if (loading) {
    return (
      <MobileAppLayout outerClassName="bg-black" className="bg-zinc-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </MobileAppLayout>
    );
  }

  if (!product) {
    return (
      <MobileAppLayout outerClassName="bg-black" className="bg-zinc-50 flex items-center justify-center">
        <div className="text-zinc-500">Producto no encontrado</div>
      </MobileAppLayout>
    );
  }

  return (
    <MobileAppLayout outerClassName="bg-black" className="bg-zinc-50">
      <header className="bg-primary text-white">
        <div className="px-6 pt-6 pb-5 flex items-center justify-center relative">
          <BackButton
            className="absolute left-6 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full border border-white/30 flex items-center justify-center text-white"
            aria-label="Volver"
          />
          <h1 className="text-xl font-semibold tracking-tight">Detalle</h1>
        </div>
      </header>

      <div className="bg-zinc-50 pb-36">
        <div className="h-64 bg-zinc-200 relative">
          <img 
            src={product.image || 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=1600&auto=format&fit=crop'} 
            alt={product.title} 
            className="absolute inset-0 h-full w-full object-cover" 
          />
        </div>

        <div className="px-6 pt-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">{product.title}</h2>
              <p className="mt-2 text-sm text-zinc-500 leading-relaxed">{product.desc}</p>
            </div>
            <div className="shrink-0 rounded-full bg-primary px-4 py-2 text-white text-sm font-semibold">
              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(product.price)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
               {product.stock > 0 ? `Disponibles: ${product.stock}` : 'Agotado'}
            </span>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 md:max-w-[430px] md:mx-auto">
          <div className="p-4 space-y-4">
             <div className="flex items-center justify-between bg-zinc-50 rounded-2xl p-2 border border-zinc-100">
                <span className="text-sm font-medium text-zinc-900 ml-2">Cantidad</span>
                <div className="flex items-center gap-3">
                   <button 
                     onClick={decrementQuantity}
                     disabled={quantity <= 1}
                     className="h-10 w-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center disabled:opacity-50 text-zinc-900"
                   >
                     <Minus className="h-4 w-4" />
                   </button>
                   <span className="text-lg font-bold w-6 text-center">{quantity}</span>
                   <button 
                     onClick={incrementQuantity}
                     disabled={quantity >= product.stock}
                     className="h-10 w-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center disabled:opacity-50 text-zinc-900"
                   >
                     <Plus className="h-4 w-4" />
                   </button>
                </div>
             </div>

              <Button 
                className="w-full h-12 rounded-full bg-zinc-900 hover:bg-zinc-800"
                onClick={addProduct}
                disabled={product.stock === 0}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Agregar al carrito
              </Button>
          </div>
        </div>
      </div>
    </MobileAppLayout>
  );
}
