"use client";

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { MobileAppLayout } from '@/components/layout/MobileAppLayout';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, ShoppingCart, Star } from 'lucide-react';

type Product = {
  title: string;
  price: string;
  desc: string;
  image: string;
  rating: number;
};

const products: Record<string, Product> = {
  '1': {
    title: 'Pomada Matte',
    price: '$180',
    desc: 'Fijación media, acabado natural y sin brillo.',
    image:
      'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=1600&auto=format&fit=crop',
    rating: 4.8,
  },
  '2': {
    title: 'Aceite de Barba',
    price: '$220',
    desc: 'Hidratación, suavidad y aroma premium.',
    image:
      'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=1600&auto=format&fit=crop',
    rating: 4.9,
  },
  '3': {
    title: 'Shampoo Detox',
    price: '$250',
    desc: 'Limpieza profunda sin resecar.',
    image:
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=1600&auto=format&fit=crop',
    rating: 4.7,
  },
};

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const product = (params?.id && products[params.id]) || products['1'];

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
          <h1 className="text-xl font-semibold tracking-tight">Detalle</h1>
        </div>
      </header>

      <div className="bg-zinc-50 pb-28">
        <div className="h-64 bg-zinc-200 relative">
          <img src={product.image} alt={product.title} className="absolute inset-0 h-full w-full object-cover" />
        </div>

        <div className="px-6 pt-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">{product.title}</h2>
              <p className="mt-2 text-sm text-zinc-500 leading-relaxed">{product.desc}</p>
            </div>
            <div className="shrink-0 rounded-full bg-primary px-4 py-2 text-white text-sm font-semibold">
              {product.price}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 text-primary">
              {[1, 2, 3, 4].map((i) => (
                <Star key={i} className="h-4 w-4 fill-primary" />
              ))}
              <Star className="h-4 w-4 text-zinc-300" />
            </div>
            <span className="text-sm text-zinc-500">{product.rating}</span>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 md:max-w-[430px] md:mx-auto">
          <div className="p-4">
            <Link href="/client/cart" className="block">
              <Button className="w-full h-12 rounded-full bg-zinc-900 hover:bg-zinc-800">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Agregar al carrito
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </MobileAppLayout>
  );
}
