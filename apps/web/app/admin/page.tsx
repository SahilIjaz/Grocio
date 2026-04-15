"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  contactEmail?: string;
}

interface UsersResponse {
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface Analytics {
  totalUsers: number;
  totalTenants: number;
  totalOrders: number;
  totalRevenue: number;
  usersByRole: { role: string; _count: number }[];
  ordersByStatus: { status: string; _count: number }[];
  recentOrders: any[];
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [userPage, setUserPage] = useState(1);
  const [userLimit, setUserLimit] = useState(10);
  const [userSearch, setUserSearch] = useState("");
  const [userRole, setUserRole] = useState("");
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/auth/login");
      return;
    }

    const userData = JSON.parse(userStr);
    if (userData.role !== "super_admin") {
      router.push("/");
      return;
    }

    setUser(userData);

    // Fetch all data
    Promise.all([
      fetch("http://localhost:3001/api/v1/tenants").then((res) => res.json()),
      fetch("http://localhost:3001/api/v1/analytics").then((res) => res.json()),
    ])
      .then(([tenantsData, analyticsData]) => {
        setTenants(Array.isArray(tenantsData) ? tenantsData : []);
        setAnalytics(analyticsData);
      })
      .finally(() => setLoading(false));
  }, [router]);

  // Fetch users when page, search, or role changes
  useEffect(() => {
    const params = new URLSearchParams({
      page: userPage.toString(),
      limit: userLimit.toString(),
      ...(userSearch && { search: userSearch }),
      ...(userRole && { role: userRole }),
    });

    fetch(`http://localhost:3001/api/v1/users?${params}`)
      .then((res) => res.json())
      .then((data: UsersResponse) => {
        setUsers(data.data);
        setTotalUsers(data.pagination.total);
        setTotalPages(data.pagination.pages);
      })
      .catch((err) => console.error("Error fetching users:", err));
  }, [userPage, userSearch, userRole, userLimit]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/");
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "var(--spacing-4)" }}>⏳</div>
          <p style={{ color: "var(--gray-600)", fontSize: "1.1rem" }}>Loading admin panel...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen" style={{ background: "var(--gray-50)" }}>
      {/* Header */}
      <header style={{ background: "linear-gradient(135deg, var(--gray-900) 0%, var(--gray-800) 100%)", boxShadow: "var(--shadow-lg)", color: "white" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--spacing-4) var(--spacing-8)" }}>
          <Link href="/">
            <div className="logo" style={{ color: "white" }}>
              <span>👑</span>
              <span>Grocio Admin</span>
            </div>
          </Link>
          <div style={{ display: "flex", gap: "var(--spacing-6)", alignItems: "center" }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>
                👋 {user.firstName} {user.lastName}
              </p>
              <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.8 }}>Super Administrator</p>
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: "rgba(255,255,255,0.2)",
                color: "white",
                padding: "var(--spacing-2) var(--spacing-4)",
                borderRadius: "var(--radius-base)",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                transition: "all var(--transition-fast)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.2)";
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", minHeight: "calc(100vh - 80px)" }}>
        {/* Sidebar */}
        <aside style={{ background: "white", borderRight: "1px solid var(--gray-200)", padding: "var(--spacing-6)", overflowY: "auto" }}>
          <h3 style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--gray-500)", marginBottom: "var(--spacing-4)" }}>
            Administration
          </h3>
          {[
            { id: "overview", label: "Dashboard", icon: "📊" },
            { id: "tenants", label: "Tenants", icon: "🏢" },
            { id: "users", label: "Users", icon: "👥" },
            { id: "analytics", label: "Analytics", icon: "📈" },
            { id: "reports", label: "Reports", icon: "📋" },
            { id: "settings", label: "System Settings", icon: "⚙️" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "var(--spacing-3) var(--spacing-4)",
                marginBottom: "var(--spacing-2)",
                borderRadius: "var(--radius-base)",
                border: "none",
                background: activeTab === item.id ? "var(--secondary-dark)" : "transparent",
                color: activeTab === item.id ? "white" : "var(--gray-700)",
                fontWeight: activeTab === item.id ? 600 : 500,
                cursor: "pointer",
                transition: "all var(--transition-fast)",
              }}
              onMouseEnter={(e) => {
                if (activeTab !== item.id) {
                  e.currentTarget.style.background = "var(--gray-100)";
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== item.id) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <span style={{ marginRight: "var(--spacing-2)" }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </aside>

        {/* Main Content */}
        <div style={{ padding: "var(--spacing-8)" }}>
          {activeTab === "overview" && (
            <div>
              <h1 style={{ marginBottom: "var(--spacing-2)" }}>Admin Dashboard</h1>
              <p style={{ color: "var(--gray-600)", marginBottom: "var(--spacing-8)" }}>System overview and key metrics</p>

              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "var(--spacing-6)", marginBottom: "var(--spacing-8)" }}>
                {[
                  { label: "Total Tenants", value: tenants.length, icon: "🏢", color: "var(--secondary)" },
                  { label: "Active Stores", value: tenants.filter((t) => t.status === "active").length, icon: "🛍️", color: "var(--primary)" },
                  { label: "Total Users", value: analytics?.totalUsers || 0, icon: "👥", color: "var(--accent)" },
                  { label: "Total Orders", value: analytics?.totalOrders || 0, icon: "🛒", color: "#8b5cf6" },
                  { label: "Total Revenue", value: `$${(analytics?.totalRevenue || 0).toFixed(2)}`, icon: "💰", color: "#10b981" },
                ].map((stat, idx) => (
                  <div key={idx} className="card" style={{ borderLeft: `4px solid ${stat.color}` }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: "var(--spacing-2)" }}>{stat.icon}</div>
                    <p style={{ color: "var(--gray-600)", marginBottom: "var(--spacing-1)" }}>{stat.label}</p>
                    <h3 style={{ fontSize: "2rem", color: stat.color, margin: 0 }}>{stat.value}</h3>
                  </div>
                ))}
              </div>

              <div className="card">
                <h3 style={{ marginBottom: "var(--spacing-6)" }}>System Status</h3>
                <div style={{ marginBottom: "var(--spacing-4)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "var(--spacing-3)", borderBottom: "1px solid var(--gray-200)" }}>
                    <span>API Server</span>
                    <span style={{ color: "var(--success)", fontWeight: 600 }}>✅ Operational</span>
                  </div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Database</span>
                    <span style={{ color: "var(--success)", fontWeight: 600 }}>✅ Connected</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "tenants" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-8)" }}>
                <h1 style={{ margin: 0 }}>Manage Tenants</h1>
                <button className="btn-primary">➕ Create Tenant</button>
              </div>

              {tenants.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🏢</div>
                  <h3 className="empty-state-title">No Tenants</h3>
                  <p className="empty-state-text">Create a new tenant to get started</p>
                </div>
              ) : (
                <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "var(--spacing-6)" }}>
                  {tenants.map((tenant) => (
                    <div key={tenant.id} className="card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--spacing-4)" }}>
                        <h3 style={{ marginBottom: 0 }}>{tenant.name}</h3>
                        <span
                          style={{
                            display: "inline-block",
                            background: tenant.status === "active" ? "#dcfce7" : "#fef3c7",
                            color: tenant.status === "active" ? "#166534" : "#b45309",
                            padding: "var(--spacing-1) var(--spacing-3)",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            textTransform: "uppercase",
                          }}
                        >
                          {tenant.status}
                        </span>
                      </div>
                      <p style={{ color: "var(--gray-600)", marginBottom: "var(--spacing-2)", fontSize: "0.9rem" }}>
                        <strong>Slug:</strong> {tenant.slug}
                      </p>
                      <p style={{ color: "var(--gray-600)", marginBottom: "var(--spacing-4)", fontSize: "0.9rem" }}>
                        <strong>Email:</strong> {tenant.contactEmail || "N/A"}
                      </p>
                      <div style={{ display: "flex", gap: "var(--spacing-2)" }}>
                        <button className="btn-primary" style={{ flex: 1, padding: "var(--spacing-2)" }}>
                          View
                        </button>
                        <button className="btn-secondary" style={{ flex: 1, padding: "var(--spacing-2)" }}>
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "users" && (
            <div>
              <h1 style={{ marginBottom: "var(--spacing-2)" }}>System Users</h1>
              <p style={{ color: "var(--gray-600)", marginBottom: "var(--spacing-6)" }}>Total: {totalUsers} users</p>

              <div className="card" style={{ marginBottom: "var(--spacing-6)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 150px 150px", gap: "var(--spacing-4)", marginBottom: "var(--spacing-6)" }}>
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setUserPage(1);
                    }}
                    style={{
                      padding: "var(--spacing-3) var(--spacing-4)",
                      border: "1px solid var(--gray-300)",
                      borderRadius: "var(--radius-base)",
                      fontSize: "1rem",
                    }}
                  />
                  <select
                    value={userRole}
                    onChange={(e) => {
                      setUserRole(e.target.value);
                      setUserPage(1);
                    }}
                    style={{
                      padding: "var(--spacing-3) var(--spacing-4)",
                      border: "1px solid var(--gray-300)",
                      borderRadius: "var(--radius-base)",
                      fontSize: "1rem",
                    }}
                  >
                    <option value="">All Roles</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="store_admin">Store Admin</option>
                    <option value="customer">Customer</option>
                  </select>
                  <select
                    value={userLimit}
                    onChange={(e) => {
                      setUserLimit(parseInt(e.target.value));
                      setUserPage(1);
                    }}
                    style={{
                      padding: "var(--spacing-3) var(--spacing-4)",
                      border: "1px solid var(--gray-300)",
                      borderRadius: "var(--radius-base)",
                      fontSize: "1rem",
                    }}
                  >
                    <option value="10">10 per page</option>
                    <option value="25">25 per page</option>
                    <option value="50">50 per page</option>
                  </select>
                </div>

                {users.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">👥</div>
                    <h3 className="empty-state-title">No Users Found</h3>
                    <p className="empty-state-text">Try adjusting your search or filters</p>
                  </div>
                ) : (
                  <>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid var(--gray-200)" }}>
                          <th style={{ textAlign: "left", padding: "var(--spacing-4)", fontWeight: 700, color: "var(--gray-900)" }}>Name</th>
                          <th style={{ textAlign: "left", padding: "var(--spacing-4)", fontWeight: 700, color: "var(--gray-900)" }}>Email</th>
                          <th style={{ textAlign: "left", padding: "var(--spacing-4)", fontWeight: 700, color: "var(--gray-900)" }}>Role</th>
                          <th style={{ textAlign: "left", padding: "var(--spacing-4)", fontWeight: 700, color: "var(--gray-900)" }}>Created</th>
                          <th style={{ textAlign: "center", padding: "var(--spacing-4)", fontWeight: 700, color: "var(--gray-900)" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid var(--gray-200)" }}>
                            <td style={{ padding: "var(--spacing-4)", color: "var(--gray-900)", fontWeight: 600 }}>
                              {u.firstName} {u.lastName}
                            </td>
                            <td style={{ padding: "var(--spacing-4)", fontSize: "0.9rem" }}>{u.email}</td>
                            <td style={{ padding: "var(--spacing-4)" }}>
                              <span
                                style={{
                                  display: "inline-block",
                                  background: u.role === "super_admin" ? "#dbeafe" : u.role === "store_admin" ? "#dcfce7" : "#f3f4f6",
                                  color: u.role === "super_admin" ? "#1e40af" : u.role === "store_admin" ? "#166534" : "#374151",
                                  padding: "var(--spacing-1) var(--spacing-3)",
                                  borderRadius: "var(--radius-sm)",
                                  fontSize: "0.85rem",
                                  fontWeight: 600,
                                }}
                              >
                                {u.role.replace("_", " ").toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: "var(--spacing-4)", fontSize: "0.9rem", color: "var(--gray-600)" }}>
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>
                            <td style={{ padding: "var(--spacing-4)", textAlign: "center" }}>
                              <button
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "var(--primary)",
                                  cursor: "pointer",
                                  fontWeight: 600,
                                  fontSize: "0.9rem",
                                }}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Pagination */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "var(--spacing-6)", paddingTop: "var(--spacing-6)", borderTop: "1px solid var(--gray-200)" }}>
                      <div style={{ fontSize: "0.9rem", color: "var(--gray-600)" }}>
                        Showing {(userPage - 1) * userLimit + 1} to {Math.min(userPage * userLimit, totalUsers)} of {totalUsers}
                      </div>
                      <div style={{ display: "flex", gap: "var(--spacing-2)" }}>
                        <button
                          onClick={() => setUserPage(Math.max(1, userPage - 1))}
                          disabled={userPage === 1}
                          style={{
                            padding: "var(--spacing-2) var(--spacing-4)",
                            border: "1px solid var(--gray-300)",
                            borderRadius: "var(--radius-base)",
                            background: userPage === 1 ? "var(--gray-100)" : "white",
                            cursor: userPage === 1 ? "not-allowed" : "pointer",
                            opacity: userPage === 1 ? 0.5 : 1,
                          }}
                        >
                          ← Previous
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setUserPage(page)}
                            style={{
                              padding: "var(--spacing-2) var(--spacing-3)",
                              border: userPage === page ? "none" : "1px solid var(--gray-300)",
                              borderRadius: "var(--radius-base)",
                              background: userPage === page ? "var(--primary)" : "white",
                              color: userPage === page ? "white" : "var(--gray-900)",
                              cursor: "pointer",
                              fontWeight: userPage === page ? 600 : 500,
                              minWidth: "40px",
                            }}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          onClick={() => setUserPage(Math.min(totalPages, userPage + 1))}
                          disabled={userPage === totalPages}
                          style={{
                            padding: "var(--spacing-2) var(--spacing-4)",
                            border: "1px solid var(--gray-300)",
                            borderRadius: "var(--radius-base)",
                            background: userPage === totalPages ? "var(--gray-100)" : "white",
                            cursor: userPage === totalPages ? "not-allowed" : "pointer",
                            opacity: userPage === totalPages ? 0.5 : 1,
                          }}
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === "analytics" && (
            <div>
              <h1 style={{ marginBottom: "var(--spacing-8)" }}>Analytics & Reports</h1>

              {/* Key Metrics */}
              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "var(--spacing-6)", marginBottom: "var(--spacing-8)" }}>
                {[
                  { label: "Total Users", value: analytics?.totalUsers || 0, icon: "👥", color: "var(--accent)" },
                  { label: "Total Tenants", value: analytics?.totalTenants || 0, icon: "🏢", color: "var(--secondary)" },
                  { label: "Total Orders", value: analytics?.totalOrders || 0, icon: "🛒", color: "#8b5cf6" },
                  { label: "Total Revenue", value: `$${(analytics?.totalRevenue || 0).toFixed(2)}`, icon: "💰", color: "#10b981" },
                ].map((stat, idx) => (
                  <div key={idx} className="card" style={{ borderLeft: `4px solid ${stat.color}` }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: "var(--spacing-2)" }}>{stat.icon}</div>
                    <p style={{ color: "var(--gray-600)", marginBottom: "var(--spacing-1)" }}>{stat.label}</p>
                    <h3 style={{ fontSize: "2rem", color: stat.color, margin: 0 }}>{stat.value}</h3>
                  </div>
                ))}
              </div>

              {/* Users by Role & Orders by Status */}
              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "var(--spacing-6)", marginBottom: "var(--spacing-8)" }}>
                <div className="card">
                  <h3 style={{ marginBottom: "var(--spacing-6)" }}>Users by Role</h3>
                  {analytics?.usersByRole && analytics.usersByRole.length > 0 ? (
                    <div>
                      {analytics.usersByRole.map((item, idx) => (
                        <div key={idx} style={{ marginBottom: "var(--spacing-4)", paddingBottom: "var(--spacing-4)", borderBottom: idx < analytics.usersByRole.length - 1 ? "1px solid var(--gray-200)" : "none" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--spacing-2)" }}>
                            <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{item.role.replace("_", " ")}</span>
                            <span style={{ color: "var(--primary)", fontWeight: 700 }}>{item._count}</span>
                          </div>
                          <div style={{ width: "100%", height: "8px", background: "var(--gray-200)", borderRadius: "4px", overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${((item._count / (analytics.totalUsers || 1)) * 100).toFixed(0)}%`,
                                height: "100%",
                                background: item.role === "super_admin" ? "#3b82f6" : item.role === "store_admin" ? "#10b981" : "#f59e0b",
                                transition: "width 0.3s",
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: "var(--gray-600)" }}>No user data available</p>
                  )}
                </div>

                <div className="card">
                  <h3 style={{ marginBottom: "var(--spacing-6)" }}>Orders by Status</h3>
                  {analytics?.ordersByStatus && analytics.ordersByStatus.length > 0 ? (
                    <div>
                      {analytics.ordersByStatus.map((item, idx) => (
                        <div key={idx} style={{ marginBottom: "var(--spacing-4)", paddingBottom: "var(--spacing-4)", borderBottom: idx < analytics.ordersByStatus.length - 1 ? "1px solid var(--gray-200)" : "none" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--spacing-2)" }}>
                            <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{item.status}</span>
                            <span style={{ color: "#8b5cf6", fontWeight: 700 }}>{item._count}</span>
                          </div>
                          <div style={{ width: "100%", height: "8px", background: "var(--gray-200)", borderRadius: "4px", overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${((item._count / (analytics.totalOrders || 1)) * 100).toFixed(0)}%`,
                                height: "100%",
                                background: item.status === "pending" ? "#f59e0b" : item.status === "confirmed" ? "#3b82f6" : item.status === "shipped" ? "#8b5cf6" : "#10b981",
                                transition: "width 0.3s",
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: "var(--gray-600)" }}>No order data available</p>
                  )}
                </div>
              </div>

              {/* Recent Orders */}
              <div className="card">
                <h3 style={{ marginBottom: "var(--spacing-6)" }}>Recent Orders</h3>
                {analytics?.recentOrders && analytics.recentOrders.length > 0 ? (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--gray-200)" }}>
                        <th style={{ textAlign: "left", padding: "var(--spacing-4)", fontWeight: 700, color: "var(--gray-900)" }}>Order #</th>
                        <th style={{ textAlign: "left", padding: "var(--spacing-4)", fontWeight: 700, color: "var(--gray-900)" }}>Customer</th>
                        <th style={{ textAlign: "left", padding: "var(--spacing-4)", fontWeight: 700, color: "var(--gray-900)" }}>Store</th>
                        <th style={{ textAlign: "left", padding: "var(--spacing-4)", fontWeight: 700, color: "var(--gray-900)" }}>Amount</th>
                        <th style={{ textAlign: "left", padding: "var(--spacing-4)", fontWeight: 700, color: "var(--gray-900)" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.recentOrders.map((order, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid var(--gray-200)" }}>
                          <td style={{ padding: "var(--spacing-4)", fontWeight: 600, color: "var(--primary)" }}>{order.orderNumber}</td>
                          <td style={{ padding: "var(--spacing-4)" }}>
                            {order.user.firstName} {order.user.lastName}
                          </td>
                          <td style={{ padding: "var(--spacing-4)" }}>{order.tenant?.name || "N/A"}</td>
                          <td style={{ padding: "var(--spacing-4)", fontWeight: 600 }}>${Number(order.totalAmount).toFixed(2)}</td>
                          <td style={{ padding: "var(--spacing-4)" }}>
                            <span
                              style={{
                                display: "inline-block",
                                background: order.status === "pending" ? "#fef3c7" : order.status === "confirmed" ? "#dbeafe" : order.status === "shipped" ? "#ede9fe" : "#dcfce7",
                                color: order.status === "pending" ? "#b45309" : order.status === "confirmed" ? "#1e40af" : order.status === "shipped" ? "#6d28d9" : "#166534",
                                padding: "var(--spacing-1) var(--spacing-3)",
                                borderRadius: "var(--radius-sm)",
                                fontSize: "0.85rem",
                                fontWeight: 600,
                                textTransform: "capitalize",
                              }}
                            >
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: "var(--gray-600)" }}>No orders yet</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "reports" && (
            <div>
              <h1 style={{ marginBottom: "var(--spacing-8)" }}>System Reports</h1>

              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "var(--spacing-6)", marginBottom: "var(--spacing-8)" }}>
                {[
                  {
                    title: "User Growth Report",
                    description: "Track user registrations and growth trends",
                    icon: "📈",
                    action: "Generate Report",
                  },
                  {
                    title: "Revenue Report",
                    description: "Detailed revenue breakdown by store and period",
                    icon: "💰",
                    action: "Generate Report",
                  },
                  {
                    title: "Order Analytics",
                    description: "Order volume, trends, and customer behavior",
                    icon: "🛒",
                    action: "Generate Report",
                  },
                  {
                    title: "Store Performance",
                    description: "Performance metrics for each store",
                    icon: "🏪",
                    action: "Generate Report",
                  },
                  {
                    title: "User Activity",
                    description: "User engagement and activity patterns",
                    icon: "👥",
                    action: "Generate Report",
                  },
                  {
                    title: "System Health",
                    description: "Platform performance and health metrics",
                    icon: "⚕️",
                    action: "View Status",
                  },
                ].map((report, idx) => (
                  <div key={idx} className="card" style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: "var(--spacing-4)" }}>{report.icon}</div>
                    <h4 style={{ marginBottom: "var(--spacing-2)", color: "var(--gray-900)" }}>{report.title}</h4>
                    <p style={{ color: "var(--gray-600)", marginBottom: "var(--spacing-6)", flex: 1 }}>{report.description}</p>
                    <button
                      style={{
                        padding: "var(--spacing-3) var(--spacing-4)",
                        background: "var(--primary)",
                        color: "white",
                        border: "none",
                        borderRadius: "var(--radius-base)",
                        cursor: "pointer",
                        fontWeight: 600,
                        transition: "all var(--transition-fast)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--primary-dark)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "var(--primary)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      {report.action}
                    </button>
                  </div>
                ))}
              </div>

              {/* Sample Report Data */}
              <div className="card">
                <h3 style={{ marginBottom: "var(--spacing-6)" }}>System Summary Report</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "var(--spacing-6)", marginBottom: "var(--spacing-8)" }}>
                  {[
                    { label: "Total Users", value: analytics?.totalUsers || 0, change: "+12.5%", trend: "up" },
                    { label: "Total Stores", value: analytics?.totalTenants || 0, change: "+5%", trend: "up" },
                    { label: "Total Orders", value: analytics?.totalOrders || 0, change: "+25%", trend: "up" },
                    { label: "Revenue", value: `$${(analytics?.totalRevenue || 0).toFixed(2)}`, change: "+15.3%", trend: "up" },
                  ].map((metric, idx) => (
                    <div key={idx} style={{ padding: "var(--spacing-4)", background: "var(--gray-50)", borderRadius: "var(--radius-base)" }}>
                      <p style={{ color: "var(--gray-600)", marginBottom: "var(--spacing-2)", fontSize: "0.9rem" }}>{metric.label}</p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "var(--spacing-2)" }}>
                        <h4 style={{ fontSize: "1.8rem", margin: 0, fontWeight: 700 }}>{metric.value}</h4>
                        <span style={{ color: metric.trend === "up" ? "#10b981" : "#ef4444", fontWeight: 600, fontSize: "0.9rem" }}>
                          {metric.trend === "up" ? "↑" : "↓"} {metric.change}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div>
              <h1 style={{ marginBottom: "var(--spacing-8)" }}>System Settings</h1>
              <div className="card" style={{ maxWidth: "600px" }}>
                <h3 style={{ marginBottom: "var(--spacing-6)" }}>System Configuration</h3>
                <div style={{ marginBottom: "var(--spacing-4)" }}>
                  <label>Platform Name</label>
                  <input type="text" value="Grocio - Multi-Tenant Grocery Platform" readOnly style={{ background: "var(--gray-100)" }} />
                </div>
                <div style={{ marginBottom: "var(--spacing-4)" }}>
                  <label>Version</label>
                  <input type="text" value="1.0.0" readOnly style={{ background: "var(--gray-100)" }} />
                </div>
                <div style={{ marginBottom: "var(--spacing-8)" }}>
                  <label>Contact Email</label>
                  <input type="email" value="support@grocio.local" readOnly style={{ background: "var(--gray-100)" }} />
                </div>
                <button className="btn-primary">Update Settings</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
