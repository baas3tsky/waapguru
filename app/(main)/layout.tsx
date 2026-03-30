'use client';

import { useEffect, useState } from 'react';
import LoginLogoutButton from '@/components/LoginLogoutButton'
import UserGreetText from '@/components/UserGreetText'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  FolderKanban, 
  Ticket, 
  BarChart3,
  Plus,
  Menu
} from 'lucide-react'

const menuItems = [
  {
    name: 'แดชบอร์ด',
    nameEn: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'โครงการ',
    nameEn: 'Projects',
    href: '/projects',
    icon: FolderKanban,
  },
  {
    name: 'Ticket ทั้งหมด',
    nameEn: 'All Tickets',
    href: '/tickets',
    icon: Ticket,
  },
  {
    name: 'สร้าง Ticket',
    nameEn: 'Create Ticket',
    href: '/tickets/create',
    icon: Plus,
  },
  {
    name: 'รายงาน',
    nameEn: 'Reports',
    href: '/reports',
    icon: BarChart3,
  },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  // Initialize background services when dashboard loads
  useEffect(() => {
    
    // Cleanup when component unmounts
    return () => {
     
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50/50 flex">
      {/* Sidebar */}
      {isSidebarOpen && (
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen fixed left-0 top-0 flex flex-col transition-all duration-300 print:hidden">
          {/* Logo Section */}
          <div className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Ticket className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-l font-bold text-gray-900">Support Ticket</h1>
                <p className="text-sm text-gray-500">Ticket Management System</p>
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 p-2">
            <div className="space-y-1">
              <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                เมนูหลัก
              </div>
              {menuItems.map((item) => {
                // Special handling for /tickets and /tickets/create to avoid both being active
                let isActive;
                if (item.href === '/tickets') {
                  // Only active if exactly /tickets or /tickets/{id}, but NOT /tickets/create
                  isActive = pathname === '/tickets' || (pathname?.startsWith('/tickets/') && !pathname?.startsWith('/tickets/create'));
                } else if (item.href === '/tickets/create') {
                  // Only active if exactly /tickets/create
                  isActive = pathname === '/tickets/create' || pathname?.startsWith('/tickets/create/');
                } else {
                  // Default behavior for other menu items
                  isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                }
                
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors group',
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <Icon 
                      className={cn(
                        'w-5 h-5 transition-colors flex-shrink-0',
                        isActive 
                          ? 'text-blue-700' 
                          : 'text-gray-900 group-hover:text-gray-700'
                      )} 
                    />
                    <div className="flex-1">
                      <div className={cn(
                        'text-sm font-medium',
                        isActive ? 'text-blue-700' : 'text-gray-700'
                      )}>
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.nameEn}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </nav>
        </aside>
      )}

      {/* Main Content Area with Sidebar offset */}
      <div className={cn(
        "flex-1 transition-all duration-300 print:ml-0",
        isSidebarOpen ? "ml-64" : "ml-0"
      )}>
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 print:hidden">
          <div className="px-6">
            <div className="flex justify-between items-center h-16">
              {/* Toggle Button */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title={isSidebarOpen ? "ปิดเมนู" : "เปิดเมนู"}
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>

              {/* User Section */}
              <div className="flex items-center space-x-4">
                <UserGreetText />
                <LoginLogoutButton />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  )
}
