"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Menu,
  X,
  GraduationCap,
  BarChart,
  CreditCard,
  ClipboardList,
  Image,
  DollarSign,
} from "lucide-react";
import { useState } from "react";
import { useSession } from "next-auth/react";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  const role = session?.user?.role || "student";

  const commonLinks = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Profile", href: "/dashboard/profile", icon: Users },
    
  ];

  const studentLinks = [
  
    { name: "Mock Tests Library", href: "/start-mock", icon: FileText },
    { name: "My Progress", href: "/dashboard/progress", icon: BarChart },
    { name: "Subscription", href: "/pricing", icon: DollarSign },
  ];

  const staffAdminLinks = [
    { name: "Mock Tests", href: "/dashboard/admin/mock-tests", icon: ClipboardList },
    { name: "Practice Tests", href: "/dashboard/admin/practice-tests", icon: FileText },
    { name: "Orders", href: "/dashboard/orders", icon: CreditCard },
    { name: "Analytics", href: "/dashboard/analytics", icon: BarChart },
  ];

  const adminLinks = [
    { name: "Manage Users", href: "/dashboard/admin/users", icon: Users },
    { name: "Pricing Plans", href: "/dashboard/admin/plans", icon: DollarSign },
    { name: "Banner Management", href: "/dashboard/admin/banners", icon: Image },
  ];

  let links = [...commonLinks];
  if (role === "student") {
    links = [...commonLinks.slice(0, 1), ...studentLinks, ...commonLinks.slice(1)];
  } else if (role === "staff") {
    links = [...commonLinks.slice(0, 1), ...staffAdminLinks, ...commonLinks.slice(1)];
  } else if (["admin", "super-admin"].includes(role)) {
    links = [...commonLinks.slice(0, 1), ...staffAdminLinks, ...adminLinks, ...commonLinks.slice(1)];
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-white shadow-md lg:hidden"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-40 transition-transform duration-300 ease-in-out transform lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-gray-200">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="text-white w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-gray-900">IELTS Pro</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className={`w-5 h-5 mr-3 ${isActive ? "text-blue-600" : "text-gray-400"}`} />
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* User Profile Summary */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-600 font-semibold text-sm">
                  {session?.user?.name?.[0] || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {session?.user?.name || "User"}
                </p>
                <p className="text-xs text-gray-500 truncate capitalize">
                  {role}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
