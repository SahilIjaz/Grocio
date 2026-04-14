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

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/auth/login");
      return;
    }

    const userData = JSON.parse(userStr);
    if (userData.role !== "store_admin") {
      router.push("/");
      return;
    }

    setUser(userData);
    setLoading(false);
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
          <p style={{ color: "var(--gray-600)", fontSize: "1.1rem" }}>Loading dashboard...</p>
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
      <header style={{ background: "white", boxShadow: "var(--shadow-md)" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--spacing-4) var(--spacing-8)" }}>
          <Link href="/">
            <div className="logo">
              <span>🛒</span>
              <span>Grocio</span>
            </div>
          </Link>
          <div style={{ display: "flex", gap: "var(--spacing-6)", alignItems: "center" }}>
            <span style={{ color: "var(--gray-600)", fontWeight: 600 }}>
              👋 {user.firstName} {user.lastName}
            </span>
            <button onClick={handleLogout} className="btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", minHeight: "calc(100vh - 70px)" }}>
        {/* Sidebar */}
        <aside style={{ background: "white", borderRight: "1px solid var(--gray-200)", padding: "var(--spacing-6)", overflowY: "auto" }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--gray-600)", marginBottom: "var(--spacing-4)" }}>
            Store Management
          </h3>
          {[
            { id: "overview", label: "📊 Overview", icon: "📊" },
            { id: "products", label: "📦 Products", icon: "📦" },
            { id: "categories", label: "🏷️ Categories", icon: "🏷️" },
            { id: "orders", label: "🛒 Orders", icon: "🛒" },
            { id: "inventory", label: "📈 Inventory", icon: "📈" },
            { id: "settings", label: "⚙️ Settings", icon: "⚙️" },
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
                background: activeTab === item.id ? "var(--primary-light)" : "transparent",
                color: activeTab === item.id ? "var(--primary-dark)" : "var(--gray-700)",
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
              {item.label.split(" ")[1]}
            </button>
          ))}
        </aside>

        {/* Main Content */}
        <div style={{ padding: "var(--spacing-8)" }}>
          {activeTab === "overview" && (
            <div>
              <h1 style={{ marginBottom: "var(--spacing-2)" }}>Store Overview</h1>
              <p style={{ color: "var(--gray-600)", marginBottom: "var(--spacing-8)" }}>Welcome to your store dashboard</p>

              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "var(--spacing-6)", marginBottom: "var(--spacing-8)" }}>
                {[
                  { label: "Total Products", value: "12", icon: "📦", color: "var(--primary)" },
                  { label: "Total Orders", value: "0", icon: "🛒", color: "var(--secondary)" },
                  { label: "Total Revenue", value: "$0.00", icon: "💰", color: "var(--accent)" },
                  { label: "Active Categories", value: "3", icon: "🏷️", color: "#8b5cf6" },
                ].map((stat, idx) => (
                  <div key={idx} className="card" style={{ borderLeft: `4px solid ${stat.color}` }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: "var(--spacing-2)" }}>{stat.icon}</div>
                    <p style={{ color: "var(--gray-600)", marginBottom: "var(--spacing-1)" }}>{stat.label}</p>
                    <h3 style={{ fontSize: "2rem", color: stat.color, margin: 0 }}>{stat.value}</h3>
                  </div>
                ))}
              </div>

              <div className="card">
                <h3 style={{ marginBottom: "var(--spacing-6)" }}>Quick Actions</h3>
                <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--spacing-4)" }}>
                  <button className="btn-primary" onClick={() => setActiveTab("products")}>
                    ➕ Add Product
                  </button>
                  <button className="btn-primary" onClick={() => setActiveTab("categories")}>
                    ➕ Add Category
                  </button>
                  <button className="btn-secondary" onClick={() => setActiveTab("orders")}>
                    📋 View Orders
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "products" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-8)" }}>
                <h1 style={{ margin: 0 }}>Products Management</h1>
                <button className="btn-primary">➕ Add New Product</button>
              </div>

              <div className="card">
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--gray-200)" }}>
                      <th style={{ textAlign: "left", padding: "var(--spacing-4)", fontWeight: 700, color: "var(--gray-900)" }}>Product Name</th>
                      <th style={{ textAlign: "left", padding: "var(--spacing-4)", fontWeight: 700, color: "var(--gray-900)" }}>Price</th>
                      <th style={{ textAlign: "left", padding: "var(--spacing-4)", fontWeight: 700, color: "var(--gray-900)" }}>Stock</th>
                      <th style={{ textAlign: "center", padding: "var(--spacing-4)", fontWeight: 700, color: "var(--gray-900)" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: "Red Apples", price: "$3.99", stock: "45" },
                      { name: "Whole Milk", price: "$4.49", stock: "32" },
                      { name: "Chicken Breast", price: "$8.99", stock: "25" },
                    ].map((product, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--gray-200)" }}>
                        <td style={{ padding: "var(--spacing-4)", color: "var(--gray-900)", fontWeight: 600 }}>{product.name}</td>
                        <td style={{ padding: "var(--spacing-4)", color: "var(--primary)" }}>{product.price}</td>
                        <td style={{ padding: "var(--spacing-4)" }}>
                          <span style={{ background: "#dcfce7", color: "#166534", padding: "var(--spacing-2) var(--spacing-3)", borderRadius: "var(--radius-sm)", fontSize: "0.9rem", fontWeight: 600 }}>
                            {product.stock}
                          </span>
                        </td>
                        <td style={{ padding: "var(--spacing-4)", textAlign: "center" }}>
                          <button style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontWeight: 600, marginRight: "var(--spacing-3)" }}>
                            Edit
                          </button>
                          <button style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontWeight: 600 }}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "orders" && (
            <div>
              <h1 style={{ marginBottom: "var(--spacing-8)" }}>Orders</h1>
              <div className="empty-state">
                <div className="empty-state-icon">📦</div>
                <h3 className="empty-state-title">No Orders Yet</h3>
                <p className="empty-state-text">Orders from customers will appear here</p>
              </div>
            </div>
          )}

          {activeTab === "categories" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-8)" }}>
                <h1 style={{ margin: 0 }}>Categories Management</h1>
                <button className="btn-primary">➕ Add Category</button>
              </div>

              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "var(--spacing-6)" }}>
                {["🥕 Produce", "🥛 Dairy", "🥩 Meat & Poultry"].map((cat, idx) => (
                  <div key={idx} className="card">
                    <div style={{ fontSize: "3rem", marginBottom: "var(--spacing-2)" }}>{cat[0]}</div>
                    <h4 style={{ marginBottom: "var(--spacing-4)" }}>{cat.substring(2)}</h4>
                    <p style={{ color: "var(--gray-600)", marginBottom: "var(--spacing-4)", fontSize: "0.9rem" }}>
                      3 products
                    </p>
                    <div style={{ display: "flex", gap: "var(--spacing-2)" }}>
                      <button className="btn-secondary" style={{ flex: 1, padding: "var(--spacing-2)" }}>
                        Edit
                      </button>
                      <button style={{ flex: 1, padding: "var(--spacing-2)", background: "#fee2e2", color: "var(--danger)", border: "none", borderRadius: "var(--radius-base)", cursor: "pointer", fontWeight: 600 }}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "inventory" && (
            <div>
              <h1 style={{ marginBottom: "var(--spacing-8)" }}>Inventory Management</h1>
              <div className="card">
                <h3 style={{ marginBottom: "var(--spacing-6)" }}>Low Stock Alert</h3>
                <p style={{ color: "var(--gray-600)", marginBottom: "var(--spacing-4)" }}>
                  No products with low stock
                </p>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div>
              <h1 style={{ marginBottom: "var(--spacing-8)" }}>Store Settings</h1>
              <div className="card" style={{ maxWidth: "600px" }}>
                <h3 style={{ marginBottom: "var(--spacing-6)" }}>Store Information</h3>
                <div style={{ marginBottom: "var(--spacing-4)" }}>
                  <label>Store Name</label>
                  <input type="text" value="Demo Grocery Store" readOnly style={{ background: "var(--gray-100)" }} />
                </div>
                <div style={{ marginBottom: "var(--spacing-4)" }}>
                  <label>Store Slug</label>
                  <input type="text" value="demo-grocery" readOnly style={{ background: "var(--gray-100)" }} />
                </div>
                <div style={{ marginBottom: "var(--spacing-8)" }}>
                  <label>Contact Email</label>
                  <input type="email" value="demo@grocio.local" readOnly style={{ background: "var(--gray-100)" }} />
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
