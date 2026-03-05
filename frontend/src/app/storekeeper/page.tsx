'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { inventoryApi } from '@/services/api'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Package, TrendingDown, AlertTriangle, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function StorekeeperDashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const userData = localStorage.getItem('user')
    
    if (!token) {
      router.replace('/login')
      return
    }
    
    if (userData) {
      setUser(JSON.parse(userData))
    }
    setLoading(false)
  }, [])

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['inventory-stats'],
    queryFn: inventoryApi.getStats,
    enabled: !!user,
  })

  const { data: items } = useQuery({
    queryKey: ['inventory-items-low'],
    queryFn: () => inventoryApi.listItems({ low_stock: true }),
    enabled: !!user,
  })

  const StatCard = ({ title, value, icon: Icon, gradient, link }: any) => (
    <Link href={link} className="group">
      <div className={`relative overflow-hidden rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br ${gradient}`}>
        <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 opacity-20">
          <Icon className="w-32 h-32 text-white" />
        </div>
        <div className="relative z-10">
          <p className="text-white/80 text-sm font-medium mb-2">{title}</p>
          <p className="text-white text-4xl font-bold">{value || 0}</p>
        </div>
      </div>
    </Link>
  )

  if (loading || statsLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-green-700 to-teal-800 p-8 shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">📦 Inventory Dashboard</h1>
            <p className="text-green-100 text-lg">Manage school inventory and stock levels</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Total Items" 
            value={stats?.total_items || 0} 
            icon={Package} 
            gradient="from-blue-500 to-blue-700" 
            link="/storekeeper/inventory" 
          />
          <StatCard 
            title="Low Stock Items" 
            value={stats?.low_stock_items || 0} 
            icon={TrendingDown} 
            gradient="from-red-500 to-red-700" 
            link="/storekeeper/inventory?low_stock=true" 
          />
          <StatCard 
            title="Total Value" 
            value={`${(stats?.total_value || 0).toLocaleString()}`} 
            icon={DollarSign} 
            gradient="from-green-500 to-green-700" 
            link="/storekeeper/inventory" 
          />
          <StatCard 
            title="Categories" 
            value={stats?.total_categories || 0} 
            icon={AlertTriangle} 
            gradient="from-purple-500 to-purple-700" 
            link="/storekeeper/inventory" 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-red-50 to-orange-50 px-6 py-4 border-b border-red-100">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">⚠️ Low Stock Items</h3>
                <Link href="/storekeeper/inventory?low_stock=true" className="text-sm font-semibold text-red-600 hover:text-red-800">
                  View all
                </Link>
              </div>
            </div>
            <div className="p-6 space-y-3">
              {items?.slice(0, 5).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-red-50/50 transition-colors border border-red-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">Stock: {item.quantity} {item.unit}</p>
                  </div>
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                    Low
                  </span>
                </div>
              ))}
              {(!items || items.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No low stock items</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-blue-100">
              <h3 className="text-xl font-bold text-gray-900">📊 Quick Actions</h3>
            </div>
            <div className="p-6 space-y-3">
              <Link href="/storekeeper/inventory" className="block p-4 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">View All Items</p>
                    <p className="text-xs text-gray-600">Browse complete inventory</p>
                  </div>
                </div>
              </Link>
              <Link href="/storekeeper/inventory" className="block p-4 rounded-xl bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xl">➕</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Add New Item</p>
                    <p className="text-xs text-gray-600">Register new inventory item</p>
                  </div>
                </div>
              </Link>
              <Link href="/storekeeper/inventory" className="block p-4 rounded-xl bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xl">📝</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Record Transaction</p>
                    <p className="text-xs text-gray-600">Add purchase or issue</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
