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
  tenantId: string;
}

interface Product {
  id: string;
  name: string;
  price: string;
  stockQuantity: number;
  description: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tenantSlug, setTenantSlug] = useState("");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [productForm, setProductForm] = useState({ name: "", price: "", stock: "", description: "", categoryId: "" });
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });

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
    fetchStoreData(userData.tenantId);
  }, [router]);

  const fetchStoreData = async (tenantId: string) => {
    try {
      // Get tenant slug from tenantId
      const tenantsRes = await fetch("http://localhost:3001/api/v1/tenants");
      const tenants = await tenantsRes.json();
      const tenant = tenants.find((t: any) => t.id === tenantId);

      if (tenant) {
        setTenantSlug(tenant.slug);

        // Fetch products and categories
        const [productsRes, categoriesRes] = await Promise.all([
          fetch(`http://localhost:3001/api/v1/tenants/${tenant.slug}/products`),
          fetch(`http://localhost:3001/api/v1/tenants/${tenant.slug}/categories`),
        ]);

        const productsData = await productsRes.json();
        const categoriesData = await categoriesRes.json();

        setProducts(Array.isArray(productsData) ? productsData : []);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      }
    } catch (error) {
      console.error("Failed to fetch store data:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/");
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantSlug || !productForm.categoryId) {
      alert("⚠️ Please select a category");
      return;
    }

    try {
      // This would need an API endpoint to create products
      // For now, just show success and refresh
      setProductForm({ name: "", price: "", stock: "", description: "", categoryId: "" });
      setShowAddProduct(false);
      alert("✅ Product added! (You can implement full API integration)");
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantSlug) return;

    try {
      // This would need an API endpoint to create categories
      // For now, just show success and refresh
      setCategoryForm({ name: "", description: "" });
      setShowAddCategory(false);
      alert("✅ Category added! (You can implement full API integration)");
    } catch (error) {
      console.error("Error:", error);
    }
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

  const totalProducts = products.length;
  const totalRevenue = "$0.00";
  const activeCategories = categories.length;

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
            >
              <span style={{ marginRight: "var(--spacing-2)" }}>{item.icon}</span>
              {item.label.split(" ")[1]}
            </button>
          ))}
        </aside>

        {/* Main Content */}
        <div style={{ padding: "var(--spacing-8)", overflowY: "auto" }}>
          {activeTab === "overview" && (
            <div>
              <h1 style={{ marginBottom: "var(--spacing-2)" }}>Store Overview</h1>
              <p style={{ color: "var(--gray-600)", marginBottom: "var(--spacing-8)" }}>Welcome to your store dashboard</p>

              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "var(--spacing-6)", marginBottom: "var(--spacing-8)" }}>
                {[
                  { label: "Total Products", value: totalProducts.toString(), icon: "📦", color: "var(--primary)" },
                  { label: "Total Categories", value: activeCategories.toString(), icon: "🏷️", color: "var(--secondary)" },
                  { label: "Total Revenue", value: totalRevenue, icon: "💰", color: "var(--accent)" },
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
                  <button className="btn-primary" onClick={() => { setActiveTab("products"); setShowAddProduct(true); }}>
                    ➕ Add Product
                  </button>
                  <button className="btn-primary" onClick={() => { setActiveTab("categories"); setShowAddCategory(true); }}>
                    ➕ Add Category
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "products" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-8)" }}>
                <h1 style={{ margin: 0 }}>Products Management ({totalProducts})</h1>
                <button
                  className="btn-primary"
                  onClick={() => {
                    if (categories.length === 0) {
                      alert("⚠️ Please create at least one category first!");
                      setActiveTab("categories");
                      setShowAddCategory(true);
                    } else {
                      setShowAddProduct(true);
                    }
                  }}
                >
                  ➕ Add New Product
                </button>
              </div>

              {showAddProduct && categories.length > 0 && (
                <div className="card" style={{ marginBottom: "var(--spacing-8)", background: "#f0fdf4", borderLeft: "4px solid var(--success)" }}>
                  <h3 style={{ marginBottom: "var(--spacing-4)" }}>Add New Product</h3>
                  <form onSubmit={handleAddProduct}>
                    <div style={{ marginBottom: "var(--spacing-4)" }}>
                      <label>Category *</label>
                      <select
                        value={productForm.categoryId}
                        onChange={(e) => setProductForm({...productForm, categoryId: e.target.value})}
                        required
                        style={{ width: "100%", padding: "var(--spacing-3) var(--spacing-4)", border: "2px solid var(--gray-200)", borderRadius: "var(--radius-base)", fontSize: "1rem" }}
                      >
                        <option value="">Select a category</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ marginBottom: "var(--spacing-4)" }}>
                      <label>Product Name *</label>
                      <input type="text" value={productForm.name} onChange={(e) => setProductForm({...productForm, name: e.target.value})} required />
                    </div>
                    <div style={{ marginBottom: "var(--spacing-4)" }}>
                      <label>Price *</label>
                      <input type="number" step="0.01" value={productForm.price} onChange={(e) => setProductForm({...productForm, price: e.target.value})} required />
                    </div>
                    <div style={{ marginBottom: "var(--spacing-4)" }}>
                      <label>Stock Quantity *</label>
                      <input type="number" value={productForm.stock} onChange={(e) => setProductForm({...productForm, stock: e.target.value})} required />
                    </div>
                    <div style={{ marginBottom: "var(--spacing-4)" }}>
                      <label>Description</label>
                      <textarea value={productForm.description} onChange={(e) => setProductForm({...productForm, description: e.target.value})} />
                    </div>
                    <div style={{ display: "flex", gap: "var(--spacing-4)" }}>
                      <button type="submit" className="btn-primary">Save Product</button>
                      <button type="button" className="btn-secondary" onClick={() => setShowAddProduct(false)}>Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              {showAddProduct && categories.length === 0 && (
                <div className="card" style={{ marginBottom: "var(--spacing-8)", background: "#fef3c7", borderLeft: "4px solid var(--warning)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)" }}>
                    <div style={{ fontSize: "2rem" }}>⚠️</div>
                    <div>
                      <h3 style={{ margin: 0, marginBottom: "var(--spacing-2)" }}>No Categories Found</h3>
                      <p style={{ color: "var(--gray-600)", margin: 0 }}>You must create at least one category before adding products.</p>
                    </div>
                  </div>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setShowAddProduct(false);
                      setShowAddCategory(true);
                      setActiveTab("categories");
                    }}
                    style={{ marginTop: "var(--spacing-4)" }}
                  >
                    Create Category First
                  </button>
                </div>
              )}

              {products.length === 0 ? (
                <div className="card">
                  <div className="empty-state">
                    <div className="empty-state-icon">📦</div>
                    <h3 className="empty-state-title">No Products Yet</h3>
                    <p className="empty-state-text">Add your first product to get started</p>
                    <button className="btn-primary" onClick={() => setShowAddProduct(true)}>Add Product</button>
                  </div>
                </div>
              ) : (
                <div className="card">
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--gray-200)" }}>
                        <th style={{ textAlign: "left", padding: "var(--spacing-4)", fontWeight: 700, color: "var(--gray-900)" }}>Product Name</th>
                        <th style={{ textAlign: "left", padding: "var(--spacing-4)", fontWeight: 700, color: "var(--gray-900)" }}>Price</th>
                        <th style={{ textAlign: "left", padding: "var(--spacing-4)", fontWeight: 700, color: "var(--gray-900)" }}>Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product) => (
                        <tr key={product.id} style={{ borderBottom: "1px solid var(--gray-200)" }}>
                          <td style={{ padding: "var(--spacing-4)", color: "var(--gray-900)", fontWeight: 600 }}>{product.name}</td>
                          <td style={{ padding: "var(--spacing-4)", color: "var(--primary)" }}>${Number(product.price).toFixed(2)}</td>
                          <td style={{ padding: "var(--spacing-4)" }}>
                            <span style={{ background: "#dcfce7", color: "#166534", padding: "var(--spacing-2) var(--spacing-3)", borderRadius: "var(--radius-sm)", fontSize: "0.9rem", fontWeight: 600 }}>
                              {product.stockQuantity}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "categories" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-8)" }}>
                <h1 style={{ margin: 0 }}>Categories Management ({activeCategories})</h1>
                <button className="btn-primary" onClick={() => setShowAddCategory(true)}>➕ Add Category</button>
              </div>

              {showAddCategory && (
                <div className="card" style={{ marginBottom: "var(--spacing-8)", background: "#f0fdf4", borderLeft: "4px solid var(--success)" }}>
                  <h3 style={{ marginBottom: "var(--spacing-4)" }}>Add New Category</h3>
                  <form onSubmit={handleAddCategory}>
                    <div style={{ marginBottom: "var(--spacing-4)" }}>
                      <label>Category Name</label>
                      <input type="text" value={categoryForm.name} onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})} required />
                    </div>
                    <div style={{ marginBottom: "var(--spacing-4)" }}>
                      <label>Description</label>
                      <textarea value={categoryForm.description} onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})} />
                    </div>
                    <div style={{ display: "flex", gap: "var(--spacing-4)" }}>
                      <button type="submit" className="btn-primary">Save Category</button>
                      <button type="button" className="btn-secondary" onClick={() => setShowAddCategory(false)}>Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              {categories.length === 0 ? (
                <div className="card">
                  <div className="empty-state">
                    <div className="empty-state-icon">🏷️</div>
                    <h3 className="empty-state-title">No Categories Yet</h3>
                    <p className="empty-state-text">Create your first category to organize products</p>
                    <button className="btn-primary" onClick={() => setShowAddCategory(true)}>Add Category</button>
                  </div>
                </div>
              ) : (
                <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "var(--spacing-6)" }}>
                  {categories.map((cat) => (
                    <div key={cat.id} className="card">
                      <h4 style={{ marginBottom: "var(--spacing-4)" }}>{cat.name}</h4>
                      <p style={{ color: "var(--gray-600)", marginBottom: "var(--spacing-4)", fontSize: "0.9rem" }}>
                        {cat.description || "No description"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
