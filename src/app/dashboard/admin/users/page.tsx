"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  Search, 
  Trash2, 
  CheckCircle,
  AlertCircle,
  X,
  Sparkles,
  Users,
  ShieldCheck,
  Crown,
  UserPlus,
  Loader2,
} from "lucide-react";

interface UserType {
  _id: string;
  name: string;
  email: string;
  role: "student" | "admin" | "super-admin" | "staff";
  createdAt: string;
}

export default function UserManagementPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  // Create User Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "student"
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setSuccessMessage("");
      setError("");
      
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to update role");
      }

      setUsers(users.map(user => 
        user._id === userId ? { ...user, role: newRole as UserType["role"] } : user
      ));
      
      setSuccessMessage("User role updated successfully");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    try {
      setSuccessMessage("");
      setError("");

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete user");
      }

      setUsers(users.filter(user => user._id !== userId));
      setSuccessMessage("User deleted successfully");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    setError("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to create user");
      }

      setUsers([data, ...users]);
      setSuccessMessage("User created successfully");
      setIsCreateModalOpen(false);
      setNewUser({ name: "", email: "", password: "", role: "student" });
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreatingUser(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if current user can modify the target user
  const canModifyUser = (targetUser: UserType) => {
    const currentRole = session?.user?.role;
    
    // Can't modify yourself
    if (targetUser._id === session?.user?.id) {
      return false;
    }
    
    // Super-admin can modify everyone
    if (currentRole === "super-admin") {
      return true;
    }
    
    // Admin can only modify students and staff, not other admins or super-admins
    if (currentRole === "admin") {
      return targetUser.role === "student" || targetUser.role === "staff";
    }
    
    return false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="inline-flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <p className="text-sm font-semibold text-slate-700">Loading users…</p>
        </div>
      </div>
    );
  }

  const roleLabel = (r: UserType["role"]) =>
    r === "super-admin" ? "Super Admin" : r.charAt(0).toUpperCase() + r.slice(1);

  const rolePill = (r: UserType["role"]) => {
    if (r === "super-admin") return "bg-rose-50 text-rose-700 border-rose-200";
    if (r === "admin") return "bg-violet-50 text-violet-700 border-violet-200";
    if (r === "staff") return "bg-sky-50 text-sky-700 border-sky-200";
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  };

  const totalUsers = users.length;
  const studentsCount = users.filter((u) => u.role === "student").length;
  const staffCount = users.filter((u) => u.role === "staff").length;
  const adminCount = users.filter((u) => u.role === "admin").length + users.filter((u) => u.role === "super-admin").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-indigo-600 text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-xs font-extrabold uppercase tracking-widest text-slate-700">
              Admin
            </span>
          </div>
          <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            User management
          </h1>
          <p className="text-slate-600 text-sm mt-1 max-w-2xl">
            Manage accounts and permissions. Role changes apply immediately.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white font-extrabold text-sm hover:bg-slate-800 shadow-lg shadow-slate-900/10"
          type="button"
        >
          <UserPlus className="w-4 h-4" />
          Create user
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-5 h-5 text-blue-700" />} label="Total users" value={String(totalUsers)} />
        <StatCard icon={<ShieldCheck className="w-5 h-5 text-emerald-700" />} label="Students" value={String(studentsCount)} />
        <StatCard icon={<ShieldCheck className="w-5 h-5 text-sky-700" />} label="Staff" value={String(staffCount)} />
        <StatCard icon={<Crown className="w-5 h-5 text-violet-700" />} label="Admins" value={String(adminCount)} />
      </div>

      {/* Notifications */}
      {error && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5" />
          <div>
            <p className="text-sm font-extrabold text-rose-800">Action failed</p>
            <p className="text-sm font-medium text-rose-700 mt-1">{error}</p>
          </div>
        </div>
      )}
      {successMessage && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
          <div>
            <p className="text-sm font-extrabold text-emerald-800">Success</p>
            <p className="text-sm font-medium text-emerald-700 mt-1">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="rounded-4xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="relative w-full md:max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              className="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-900"
              placeholder="Search by name or email…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search users"
            />
          </div>
          <div className="text-sm text-slate-600 font-medium">
            Showing <span className="font-extrabold text-slate-900">{filteredUsers.length}</span> of{" "}
            <span className="font-extrabold text-slate-900">{users.length}</span>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-4xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  Joined Date
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    No users found. Try a different search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-linear-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-indigo-700 font-extrabold">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-extrabold text-slate-900">{user.name}</div>
                          <div className="text-sm text-slate-500 font-medium">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {canModifyUser(user) ? (
                        <select
                          aria-label="Select user role"
                          title="Select user role"
                          value={user.role}
                          onChange={(e) => handleRoleChange(user._id, e.target.value)}
                          className={`text-xs rounded-full px-3 py-2 font-extrabold border focus:ring-2 focus:ring-blue-500 cursor-pointer ${rolePill(
                            user.role
                          )}`}
                        >
                          <option value="student">Student</option>
                          <option value="staff">Staff</option>
                          {session?.user?.role === "super-admin" && (
                            <>
                              <option value="admin">Admin</option>
                              <option value="super-admin">Super Admin</option>
                            </>
                          )}
                        </select>
                      ) : (
                        <span
                          className={`text-xs rounded-full px-3 py-2 font-extrabold inline-flex border ${rolePill(
                            user.role
                          )}`}
                        >
                          {roleLabel(user.role)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                      {new Date(user.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {canModifyUser(user) ? (
                        <button
                          onClick={() => handleDeleteUser(user._id)}
                          className="text-rose-600 hover:text-rose-800 p-2 rounded-2xl hover:bg-rose-50 transition-colors"
                          title="Delete User"
                          type="button"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      ) : (
                        <button
                          disabled
                          className="text-slate-300 p-2 rounded-2xl cursor-not-allowed"
                          title="Cannot delete this user"
                          type="button"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-4xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Create new user</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Set role and initial password.
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">Full name</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-900 placeholder:text-slate-400"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">Email address</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-900 placeholder:text-slate-400"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">Password</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-900 placeholder:text-slate-400"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label htmlFor="role-select" className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">Role</label>
                <select
                  id="role-select"
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-900 bg-white"
                >
                  <option value="student">Student</option>
                  <option value="staff">Staff</option>
                  {session?.user?.role === "super-admin" && (
                    <>
                      <option value="admin">Admin</option>
                      <option value="super-admin">Super Admin</option>
                    </>
                  )}
                </select>
                {session?.user?.role === "admin" && (
                  <p className="text-xs text-slate-500 mt-2 font-medium">
                    As an admin, you can only create Student and Staff accounts
                  </p>
                )}
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 rounded-2xl text-sm font-extrabold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-4 py-2.5 bg-slate-900 text-white rounded-2xl text-sm font-extrabold hover:bg-slate-800 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
                >
                  {creatingUser ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    "Create User"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-4xl border border-slate-200 bg-white/90 backdrop-blur p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">{label}</p>
          <p className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">{value}</p>
        </div>
        <div className="h-11 w-11 rounded-3xl border border-slate-200 bg-slate-50 flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );
}
