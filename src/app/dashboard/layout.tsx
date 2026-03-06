import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Wrapper */}
      <div className="flex-1 min-w-0 flex flex-col lg:pl-64 transition-all duration-300">
        {/* Topbar */}
        <Topbar />

        {/* Main Content Area */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto overflow-x-hidden w-full max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
