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

    // Fetch tenants
    fetch("http://localhost:3001/api/v1/tenants")
      .then((res) => res.json())
      .then((data) => {
        setTenants(Array.isArray(data) ? data : []);
      })
      .finally(() => setLoading(false));
  }, [router]);

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
                  { label: "Total Users", value: "15", icon: "👥", color: "var(--accent)" },
                  { label: "Total Orders", value: "0", icon: "🛒", color: "#8b5cf6" },
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
              <h1 style={{ marginBottom: "var(--spacing-8)" }}>System Users</h1>
              <div className="card">
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--gray-200)" }}>
                      <th style={{ textAlign: "left", padding: "var(--spacing-4)", fontWeight: 700, color: "var(--gray-900)" }}>Name</th>
                      <th style={{ textAlign: "left", padding: "var(--spacing-4)", fontWeight: 700, color: "var(--gray-900)" }}>Email</th>
                      <th style={{ textAlign: "left", padding: "var(--spacing-4)", fontWeight: 700, color: "var(--gray-900)" }}>Role</th>
                      <th style={{ textAlign: "center", padding: "var(--spacing-4)", fontWeight: 700, color: "var(--gray-900)" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: "Admin User", email: "admin@grocio.local", role: "super_admin" },
                      { name: "Store Owner", email: "owner@democore.local", role: "store_admin" },
                      { name: "Customer", email: "customer@example.local", role: "customer" },
                    ].map((u, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--gray-200)" }}>
                        <td style={{ padding: "var(--spacing-4)", color: "var(--gray-900)", fontWeight: 600 }}>{u.name}</td>
                        <td style={{ padding: "var(--spacing-4)" }}>{u.email}</td>
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
                        <td style={{ padding: "var(--spacing-4)", textAlign: "center" }}>
                          <button style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontWeight: 600 }}>
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "analytics" && (
            <div>
              <h1 style={{ marginBottom: "var(--spacing-8)" }}>Analytics</h1>
              <div className="empty-state">
                <div className="empty-state-icon">📊</div>
                <h3 className="empty-state-title">Coming Soon</h3>
                <p className="empty-state-text">Advanced analytics dashboard is under development</p>
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
