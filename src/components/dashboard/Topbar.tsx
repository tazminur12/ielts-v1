'use client';

import { Bell, Search, LogOut, Loader2, Check } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type NotificationItem = {
  id: string;
  title: string;
  description?: string;
  href?: string;
  createdAt: string;
  kind: 'result' | 'billing' | 'content' | 'system';
};

const NOTIF_READ_KEY = 'ielts.notifications.read.v1';

function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function Topbar() {
  const { data: session } = useSession();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const [notifsError, setNotifsError] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const notifWrapRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(NOTIF_READ_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { ids?: string[] };
      if (Array.isArray(parsed?.ids)) setReadIds(new Set(parsed.ids));
    } catch {
      // ignore
    }
  }, []);

  const unreadCount = useMemo(() => {
    return notifs.reduce((acc, n) => acc + (readIds.has(n.id) ? 0 : 1), 0);
  }, [notifs, readIds]);

  const fetchNotifications = async () => {
    setNotifsLoading(true);
    setNotifsError(null);
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to load notifications');
      }
      setNotifs(Array.isArray(data.items) ? data.items : []);
    } catch (e: any) {
      setNotifsError(e?.message || 'Failed to load notifications');
    } finally {
      setNotifsLoading(false);
    }
  };

  // Load notifications once (and refresh every minute)
  useEffect(() => {
    fetchNotifications();
    const t = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(t);
  }, []);

  // Click outside / Esc close
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!showNotifications) return;
      const el = notifWrapRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setShowNotifications(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowNotifications(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showNotifications]);

  const markAllRead = () => {
    const next = new Set(readIds);
    for (const n of notifs) next.add(n.id);
    setReadIds(next);
    try {
      localStorage.setItem(NOTIF_READ_KEY, JSON.stringify({ ids: Array.from(next) }));
    } catch {
      // ignore
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 relative">
      {/* 🔍 Search Bar (ONLY LARGE SCREEN) */}
      <div className="flex-1 max-w-xl hidden lg:block">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 dark:text-slate-500" />
          </div>

          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="Search for pages..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-900/40 text-slate-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />

          {/* 🔥 Search Dropdown */}
          {search && (
            <div className="absolute mt-2 w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg z-50 max-h-60 overflow-y-auto">
              {filteredItems.length > 0 ? (
                filteredItems.map(item => (
                  <div
                    key={item.href}
                    onClick={() => {
                      router.push(item.href);
                      setSearch('');
                    }}
                    className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-900 cursor-pointer text-sm text-slate-800 dark:text-slate-100"
                  >
                    {item.name}
                  </div>
                ))
              ) : (
                <p className="px-4 py-2 text-sm text-gray-500 dark:text-slate-400">
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
        <div className="relative" ref={notifWrapRef}>
          <button
            onClick={() => {
              const next = !showNotifications;
              setShowNotifications(next);
              if (next) {
                fetchNotifications();
                markAllRead();
              }
            }}
            aria-label="Notifications"
            title="Notifications"
            className="p-2 rounded-2xl text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-900 relative transition-colors"
          >
            <Bell className="w-6 h-6" />
            {unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 rounded-full bg-rose-600 text-white text-[11px] font-extrabold flex items-center justify-center ring-2 ring-white dark:ring-slate-950">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : null}
          </button>

          {/* Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-88 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    Notifications
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Latest updates for your account
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    markAllRead();
                    setShowNotifications(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  <Check className="w-3.5 h-3.5" />
                  Done
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifsLoading ? (
                  <div className="px-4 py-6 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading…
                  </div>
                ) : notifsError ? (
                  <div className="px-4 py-4 text-sm text-rose-700 dark:text-rose-300">
                    {notifsError}
                    <button
                      type="button"
                      onClick={fetchNotifications}
                      className="ml-2 underline font-semibold"
                    >
                      Retry
                    </button>
                  </div>
                ) : notifs.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      You’re all caught up
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      No new notifications right now.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {notifs.map(n => {
                      const content = (
                        <div className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                                {n.title}
                              </p>
                              {n.description ? (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                                  {n.description}
                                </p>
                              ) : null}
                            </div>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                              {timeAgo(n.createdAt)}
                            </span>
                          </div>
                        </div>
                      );

                      return n.href ? (
                        <Link
                          key={n.id}
                          href={n.href}
                          onClick={() => setShowNotifications(false)}
                          className="block"
                        >
                          {content}
                        </Link>
                      ) : (
                        <div key={n.id}>{content}</div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-gray-200 mx-2"></div>

        {/* User */}
        <div className="flex items-center space-x-3">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
              {session?.user?.name}
            </span>
            <span className="text-xs text-gray-500 dark:text-slate-400 capitalize">
              {session?.user?.role}
            </span>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="flex items-center justify-center p-2 rounded-xl text-gray-500 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-rose-950/30 hover:text-red-600 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
