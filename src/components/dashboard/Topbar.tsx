'use client';

import { Bell, Search, LogOut } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Topbar() {
  const { data: session } = useSession();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  // 🔥 Demo searchable routes (you can extend from your sidebar)
  const searchItems = [
    { name: 'Mock Tests', href: '/dashboard/mock-tests' },
    { name: 'Practice', href: '/dashboard/practice' },
    { name: 'Results', href: '/dashboard/results' },
    { name: 'Writing Feedback', href: '/dashboard/feedback/writing' },
    { name: 'Speaking Feedback', href: '/dashboard/feedback/speaking' },
    { name: 'Progress', href: '/dashboard/progress' },
    { name: 'Saved Questions', href: '/dashboard/saved' },
    { name: 'Subscription', href: '/dashboard/subscription' },
  ];

  // 🔍 Filter
  const filteredItems = searchItems.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );

  // 🔥 Enter → navigate
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredItems.length > 0) {
      router.push(filteredItems[0].href);
      setSearch('');
    }
  };

  // 🔔 Demo notifications
  const notifications = [
    { id: 1, text: 'New mock test available' },
    { id: 2, text: 'Your result has been published' },
    { id: 3, text: 'Subscription expiring soon' },
  ];

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 relative">
      {/* 🔍 Search Bar (ONLY LARGE SCREEN) */}
      <div className="flex-1 max-w-xl hidden lg:block">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>

          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="Search for pages..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />

          {/* 🔥 Search Dropdown */}
          {search && (
            <div className="absolute mt-2 w-full bg-white border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
              {filteredItems.length > 0 ? (
                filteredItems.map(item => (
                  <div
                    key={item.href}
                    onClick={() => {
                      router.push(item.href);
                      setSearch('');
                    }}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                  >
                    {item.name}
                  </div>
                ))
              ) : (
                <p className="px-4 py-2 text-sm text-gray-500">
                  No results found
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center space-x-4 ml-auto">
        {/* 🔔 Notification */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
            title="Notifications"
            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 relative"
          >
            <Bell className="w-6 h-6" />
            <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
          </button>

          {/* Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 bg-white border rounded-lg shadow-lg z-50">
              <div className="p-3 border-b font-semibold text-sm">
                Notifications
              </div>

              <div className="max-h-60 overflow-y-auto">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                  >
                    {n.text}
                  </div>
                ))}
              </div>

              <div className="p-2 text-center text-xs text-gray-500">
                No more notifications
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-gray-200 mx-2"></div>

        {/* User */}
        <div className="flex items-center space-x-3">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-medium text-gray-900">
              {session?.user?.name}
            </span>
            <span className="text-xs text-gray-500 capitalize">
              {session?.user?.role}
            </span>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="flex items-center justify-center p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
