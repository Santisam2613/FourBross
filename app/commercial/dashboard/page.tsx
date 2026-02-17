import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Users, ShoppingBag, TrendingUp, Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const recentClients = [
  { id: 1, name: 'Carlos Ruiz', email: 'carlos@mail.com', lastVisit: 'Hace 2 días', loyalty: 7 },
  { id: 2, name: 'Luis Méndez', email: 'luis@mail.com', lastVisit: 'Hoy', loyalty: 3 },
  { id: 3, name: 'Jorge Torres', email: 'jorge@mail.com', lastVisit: 'Ayer', loyalty: 9 },
  { id: 4, name: 'Santiago P.', email: 'santi@mail.com', lastVisit: 'Hace 5 días', loyalty: 1 },
];

export default function CommercialDashboard() {
  return (
    <DashboardLayout role="commercial">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
           <h1 className="text-2xl font-bold tracking-tight">CRM Comercial</h1>
           <div className="flex gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                  <Input placeholder="Buscar cliente..." className="pl-9" />
              </div>
              <Button>Nuevo Cliente</Button>
           </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <Card>
              <CardContent className="p-6 flex items-center gap-4">
                 <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    <Users className="h-6 w-6" />
                 </div>
                 <div>
                    <p className="text-sm text-zinc-500">Total Clientes</p>
                    <h3 className="text-2xl font-bold">1,240</h3>
                 </div>
              </CardContent>
           </Card>
           <Card>
              <CardContent className="p-6 flex items-center gap-4">
                 <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                    <ShoppingBag className="h-6 w-6" />
                 </div>
                 <div>
                    <p className="text-sm text-zinc-500">Órdenes Hoy</p>
                    <h3 className="text-2xl font-bold">24</h3>
                 </div>
              </CardContent>
           </Card>
           <Card>
              <CardContent className="p-6 flex items-center gap-4">
                 <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                    <TrendingUp className="h-6 w-6" />
                 </div>
                 <div>
                    <p className="text-sm text-zinc-500">Retención</p>
                    <h3 className="text-2xl font-bold">85%</h3>
                 </div>
              </CardContent>
           </Card>
        </div>

        {/* Clients Table Mock */}
        <Card>
           <CardHeader>
              <CardTitle>Clientes Recientes</CardTitle>
           </CardHeader>
           <CardContent>
              <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                    <thead className="text-xs text-zinc-500 uppercase bg-zinc-50">
                       <tr>
                          <th className="px-6 py-3">Cliente</th>
                          <th className="px-6 py-3">Última Visita</th>
                          <th className="px-6 py-3">Fidelidad</th>
                          <th className="px-6 py-3">Acciones</th>
                       </tr>
                    </thead>
                    <tbody>
                       {recentClients.map((client) => (
                          <tr key={client.id} className="bg-white border-b hover:bg-zinc-50">
                             <td className="px-6 py-4 font-medium text-zinc-900">
                                <div>{client.name}</div>
                                <div className="text-xs text-zinc-500">{client.email}</div>
                             </td>
                             <td className="px-6 py-4">{client.lastVisit}</td>
                             <td className="px-6 py-4">
                                <div className="w-full bg-zinc-200 rounded-full h-2.5 max-w-[100px]">
                                   <div className="bg-primary h-2.5 rounded-full" style={{ width: `${client.loyalty * 10}%` }}></div>
                                </div>
                                <span className="text-xs text-zinc-500 mt-1 block">{client.loyalty}/10</span>
                             </td>
                             <td className="px-6 py-4">
                                <Button variant="ghost" size="sm">Ver Detalle</Button>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
