import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DollarSign, ShoppingBag, PieChart, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function AdminDashboard() {
  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
           <h1 className="text-2xl font-bold tracking-tight">Panel Administrativo</h1>
           <div className="flex gap-2">
              <Button variant="outline">Descargar Reporte</Button>
           </div>
        </div>

        {/* Financial Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <Card>
              <CardContent className="p-6">
                 <div className="flex items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-medium text-zinc-500">Ventas Totales</p>
                    <DollarSign className="h-4 w-4 text-zinc-500" />
                 </div>
                 <div className="text-2xl font-bold">$124,500</div>
                 <p className="text-xs text-green-500 font-medium">+20.1% vs mes anterior</p>
              </CardContent>
           </Card>
           <Card>
              <CardContent className="p-6">
                 <div className="flex items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-medium text-zinc-500">Órdenes</p>
                    <ShoppingBag className="h-4 w-4 text-zinc-500" />
                 </div>
                 <div className="text-2xl font-bold">+573</div>
                 <p className="text-xs text-green-500 font-medium">+12% vs mes anterior</p>
              </CardContent>
           </Card>
           <Card>
              <CardContent className="p-6">
                 <div className="flex items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-medium text-zinc-500">Rentabilidad</p>
                    <PieChart className="h-4 w-4 text-zinc-500" />
                 </div>
                 <div className="text-2xl font-bold">32%</div>
                 <p className="text-xs text-zinc-500 font-medium">Margen neto</p>
              </CardContent>
           </Card>
           <Card>
              <CardContent className="p-6">
                 <div className="flex items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-medium text-zinc-500">Gastos</p>
                    <DollarSign className="h-4 w-4 text-zinc-500" />
                 </div>
                 <div className="text-2xl font-bold">$85,200</div>
                 <p className="text-xs text-red-500 font-medium">+4% vs mes anterior</p>
              </CardContent>
           </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {/* Mock Chart Area */}
           <Card className="col-span-1">
              <CardHeader>
                 <CardTitle>Ingresos por Sucursal</CardTitle>
              </CardHeader>
              <CardContent>
                 <div className="h-[300px] flex items-end justify-between gap-4 px-4 pt-4 pb-0 border-b border-zinc-100">
                    {/* Mock Bars */}
                    <div className="w-full bg-zinc-100 rounded-t-lg relative group h-[60%]">
                       <div className="absolute bottom-0 w-full bg-zinc-900 rounded-t-lg h-full group-hover:bg-primary transition-colors" />
                       <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-zinc-500">Polanco</span>
                    </div>
                    <div className="w-full bg-zinc-100 rounded-t-lg relative group h-[80%]">
                       <div className="absolute bottom-0 w-full bg-zinc-900 rounded-t-lg h-full group-hover:bg-primary transition-colors" />
                       <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-zinc-500">Roma</span>
                    </div>
                    <div className="w-full bg-zinc-100 rounded-t-lg relative group h-[40%]">
                       <div className="absolute bottom-0 w-full bg-zinc-900 rounded-t-lg h-full group-hover:bg-primary transition-colors" />
                       <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-zinc-500">Santa Fe</span>
                    </div>
                 </div>
              </CardContent>
           </Card>

           {/* Low Stock Alert */}
           <Card className="col-span-1">
              <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    Alerta de Inventario
                 </CardTitle>
              </CardHeader>
              <CardContent>
                 <div className="space-y-4">
                    {[
                       { product: 'Cera Mate Premium', branch: 'Polanco', stock: 2 },
                       { product: 'Aceite de Barba', branch: 'Roma', stock: 0 },
                       { product: 'Shampoo 1L', branch: 'Santa Fe', stock: 5 },
                    ].map((item, idx) => (
                       <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                          <div>
                             <p className="font-medium text-red-900">{item.product}</p>
                             <p className="text-xs text-red-700">Sucursal: {item.branch}</p>
                          </div>
                          <div className="text-right">
                             <span className="text-lg font-bold text-red-600">{item.stock}</span>
                             <p className="text-xs text-red-700">unid.</p>
                          </div>
                       </div>
                    ))}
                    <Button variant="outline" className="w-full">Ver Inventario Completo</Button>
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
