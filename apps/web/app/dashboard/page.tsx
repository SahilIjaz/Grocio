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
  categoryId?: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
}

interface Store {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  address: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  totalAmount: string;
  createdAt: string;
  status: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface OrderStats {
  totalOrders: number;
  deliveredOrders: number;
  pendingOrders: number;
  processingOrders: number;
  cancelledOrders: number;
  revenue: number;
  pendingOrdersValue: number;
  processingOrdersValue: number;
  orders: Order[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
  const [tenantSlug, setTenantSlug] = useState("");
  const [storeLogoPreview, setStoreLogoPreview] = useState<string>("");
  const [storeLogoFile, setStoreLogoFile] = useState<File | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [productForm, setProductForm] = useState({ name: "", price: "", stock: "", description: "", categoryId: "" });
  const [productImages, setProductImages] = useState<File[]>([]);
  const [productImagePreviews, setProductImagePreviews] = useState<string[]>([]);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  const [categorySearch, setCategorySearch] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [storeInfoForm, setStoreInfoForm] = useState({ name: "", contactEmail: "", address: "", contactPhone: "" });
  const [isEditingStoreInfo, setIsEditingStoreInfo] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [orderStatusUpdate, setOrderStatusUpdate] = useState("");

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
      const tenantsRes = await fetch(`"https://ec2-13-53-205-180.eu-north-1.compute.amazonaws.com:3001"/api/v1/tenants`);
      const tenants = await tenantsRes.json();
      const tenant = tenants.find((t: any) => t.id === tenantId);

      if (tenant) {
        setTenantSlug(tenant.slug);
        setStore(tenant);
        if (tenant.logoUrl) {
          setStoreLogoPreview(tenant.logoUrl);
        }

        // Fetch products, categories, and orders
        console.log("Dashboard - Starting fetch for:", tenant.slug);
        const [productsRes, categoriesRes, ordersRes] = await Promise.all([
          fetch(`http://localhost:3001/api/v1/tenants/${tenant.slug}/products`),
          fetch(`http://localhost:3001/api/v1/tenants/${tenant.slug}/categories`),
          fetch(`http://localhost:3001/api/v1/tenants/${tenant.slug}/orders`),
        ]);

        console.log("Dashboard - Response status - Products:", productsRes.status, "Categories:", categoriesRes.status, "Orders:", ordersRes.status);

        const productsData = await productsRes.json();
        const categoriesData = await categoriesRes.json();
        const ordersData = await ordersRes.json();

        console.log("Dashboard - Products fetched:", productsData);
        console.log("Dashboard - Categories fetched:", categoriesData);
        console.log("Dashboard - Orders fetched:", ordersData);

        setProducts(Array.isArray(productsData) ? productsData : []);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);

        console.log("Dashboard - Categories state updated to:", Array.isArray(categoriesData) ? categoriesData.length : 0);

        if (ordersData.orders) {
          setOrders(Array.isArray(ordersData.orders) ? ordersData.orders : []);
          setOrderStats(ordersData);
        }
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

    if (!productForm.name || !productForm.price) {
      alert("⚠️ Please fill in all required fields");
      return;
    }

    try {
      const imageUrls = productImagePreviews.length > 0 ? productImagePreviews : [];

      const response = await fetch(`http://localhost:3001/api/v1/tenants/${tenantSlug}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: productForm.name,
          description: productForm.description,
          price: parseFloat(productForm.price),
          stockQuantity: parseInt(productForm.stock) || 0,
          categoryId: productForm.categoryId,
          imageUrls,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create product");
      }

      const newProduct = await response.json();
      setProducts([...products, newProduct]);
      setProductForm({ name: "", price: "", stock: "", description: "", categoryId: "" });
      setProductImages([]);
      setProductImagePreviews([]);
      setCategorySearch("");
      setShowAddProduct(false);
      alert("✅ Product created successfully with " + (imageUrls.length > 0 ? imageUrls.length + " image(s)" : "no images") + "!");
    } catch (error) {
      console.error("Error:", error);
      alert(`❌ ${error instanceof Error ? error.message : "Failed to create product"}`);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name) return;

    try {
      if (editingCategory) {
        // Update existing category
        const response = await fetch(`http://localhost:3001/api/v1/categories/${editingCategory}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(categoryForm),
        });

        if (!response.ok) {
          throw new Error("Failed to update category");
        }

        const updatedCategory = await response.json();
        setCategories(categories.map((cat) => (cat.id === editingCategory ? updatedCategory : cat)));
        alert("✅ Category updated successfully!");
      } else {
        // Create new category
        if (!tenantSlug) return;

        const response = await fetch(`http://localhost:3001/api/v1/tenants/${tenantSlug}/categories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(categoryForm),
        });

        if (!response.ok) {
          throw new Error("Failed to create category");
        }

        const newCategory = await response.json();
        setCategories([...categories, newCategory]);
        alert("✅ Category created successfully!");
      }

      setCategoryForm({ name: "", description: "" });
      setShowAddCategory(false);
      setEditingCategory(null);
    } catch (error) {
      console.error("Error:", error);
      alert("❌ Failed to save category");
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("⚠️ Are you sure? This will delete the category and all associated products.")) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/v1/categories/${categoryId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      console.log("Delete response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Delete error:", errorData);
        throw new Error(errorData.error || "Failed to delete category");
      }

      setCategories(categories.filter((cat) => cat.id !== categoryId));
      alert("✅ Category deleted successfully!");
    } catch (error) {
      console.error("Delete error:", error);
      alert(`❌ ${error instanceof Error ? error.message : "Failed to delete category"}`);
    }
  };

  const startEditCategory = (category: Category) => {
    setCategoryForm({ name: category.name, description: category.description });
    setEditingCategory(category.id);
    setShowAddCategory(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setProductImages([...productImages, ...files]);

    // Create previews
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setProductImages(productImages.filter((_, i) => i !== index));
    setProductImagePreviews(productImagePreviews.filter((_, i) => i !== index));
  };

  const handleStoreLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setStoreLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setStoreLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateStoreLogo = async () => {
    if (!tenantSlug || !storeLogoPreview) return;

    try {
      const response = await fetch(`http://localhost:3001/api/v1/tenants/${tenantSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logoUrl: storeLogoPreview,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update store (${response.status})`);
      }

      const updatedStore = await response.json();
      setStore(updatedStore);
      alert("✅ Store logo updated successfully!");
    } catch (error) {
      console.error("Error:", error);
      alert(`❌ ${error instanceof Error ? error.message : "Failed to update store logo"}`);
    }
  };

  const startEditStoreInfo = () => {
    if (store) {
      setStoreInfoForm({
        name: store.name || "",
        contactEmail: store.contactEmail || "",
        address: store.address || "",
        contactPhone: store.contactPhone || "",
      });
      setIsEditingStoreInfo(true);
    }
  };

  const handleUpdateStoreInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantSlug) return;

    try {
      const response = await fetch(`http://localhost:3001/api/v1/tenants/${tenantSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(storeInfoForm),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update store (${response.status})`);
      }

      const updatedStore = await response.json();
      setStore(updatedStore);
      setIsEditingStoreInfo(false);
      alert("✅ Store information updated successfully!");
    } catch (error) {
      console.error("Error:", error);
      alert(`❌ ${error instanceof Error ? error.message : "Failed to update store information"}`);
    }
  };

  const startEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      price: product.price,
      stock: product.stockQuantity.toString(),
      description: product.description,
      categoryId: product.categoryId || "",
    });
    setShowAddProduct(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product? This action cannot be undone.")) return;

    try {
      const response = await fetch(`http://localhost:3001/api/v1/products/${productId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete product");

      setProducts(products.filter((p) => p.id !== productId));
      alert("✅ Product deleted successfully!");
    } catch (error) {
      alert(`❌ ${error instanceof Error ? error.message : "Failed to delete product"}`);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.price || !productForm.categoryId) {
      alert("❌ Name, price, and category are required");
      return;
    }

    try {
      const method = editingProduct ? "PUT" : "POST";
      const url = editingProduct
        ? `http://localhost:3001/api/v1/products/${editingProduct.id}`
        : `http://localhost:3001/api/v1/tenants/${tenantSlug}/products`;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: productForm.name,
          description: productForm.description,
          price: parseFloat(productForm.price),
          stockQuantity: parseInt(productForm.stock),
          categoryId: productForm.categoryId,
        }),
      });

      if (!response.ok) throw new Error("Failed to save product");

      const savedProduct = await response.json();

      if (editingProduct) {
        setProducts(products.map((p) => (p.id === savedProduct.id ? savedProduct : p)));
      } else {
        setProducts([...products, savedProduct]);
      }

      setShowAddProduct(false);
      setEditingProduct(null);
      setProductForm({ name: "", price: "", stock: "", description: "", categoryId: "" });
      alert(editingProduct ? "✅ Product updated successfully!" : "✅ Product added successfully!");
    } catch (error) {
      alert(`❌ ${error instanceof Error ? error.message : "Failed to save product"}`);
    }
  };

  const startEditOrder = (order: Order) => {
    setEditingOrder(order);
    setOrderStatusUpdate(order.status);
  };

  const handleUpdateOrderStatus = async () => {
    if (!editingOrder) return;

    try {
      const response = await fetch(`http://localhost:3001/api/v1/orders/${editingOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: orderStatusUpdate }),
      });

      if (!response.ok) throw new Error("Failed to update order status");

      const updatedOrder = await response.json();
      setOrders(orders.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));
      setEditingOrder(null);
      alert("✅ Order status updated successfully!");
    } catch (error) {
      alert(`❌ ${error instanceof Error ? error.message : "Failed to update order status"}`);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to delete this order? This action cannot be undone.")) return;

    try {
      const response = await fetch(`http://localhost:3001/api/v1/orders/${orderId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete order");

      setOrders(orders.filter((o) => o.id !== orderId));
      alert("✅ Order deleted successfully!");
    } catch (error) {
      alert(`❌ ${error instanceof Error ? error.message : "Failed to delete order"}`);
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
  const activeCategories = categories.length;

  console.log("Dashboard render - categories:", categories.length, categories);

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

              {/* Main Metrics */}
              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "var(--spacing-6)", marginBottom: "var(--spacing-8)" }}>
                {[
                  { label: "Total Products", value: totalProducts.toString(), icon: "📦", color: "var(--primary)" },
                  { label: "Total Categories", value: activeCategories.toString(), icon: "🏷️", color: "var(--secondary)" },
                  { label: "Revenue (Delivered)", value: `$${(orderStats?.revenue || 0).toFixed(2)}`, icon: "💰", color: "#10b981" },
                ].map((stat, idx) => (
                  <div key={idx} className="card" style={{ borderLeft: `4px solid ${stat.color}` }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: "var(--spacing-2)" }}>{stat.icon}</div>
                    <p style={{ color: "var(--gray-600)", marginBottom: "var(--spacing-1)" }}>{stat.label}</p>
                    <h3 style={{ fontSize: "2rem", color: stat.color, margin: 0 }}>{stat.value}</h3>
                  </div>
                ))}
              </div>

              {/* Order Status Breakdown */}
              <div className="card" style={{ marginBottom: "var(--spacing-8)" }}>
                <h3 style={{ marginBottom: "var(--spacing-6)" }}>Order Status Overview</h3>
                <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--spacing-4)" }}>
                  <div style={{ padding: "var(--spacing-4)", background: "#dcfce7", borderRadius: "var(--radius-base)" }}>
                    <p style={{ color: "var(--gray-600)", marginBottom: "var(--spacing-2)", fontSize: "0.9rem" }}>Delivered Orders</p>
                    <h4 style={{ fontSize: "1.5rem", color: "#166534", margin: 0 }}>{orderStats?.deliveredOrders || 0}</h4>
                    <p style={{ fontSize: "0.85rem", color: "#166534", marginTop: "var(--spacing-1)" }}>${(orderStats?.revenue || 0).toFixed(2)}</p>
                  </div>
                  <div style={{ padding: "var(--spacing-4)", background: "#fef3c7", borderRadius: "var(--radius-base)" }}>
                    <p style={{ color: "var(--gray-600)", marginBottom: "var(--spacing-2)", fontSize: "0.9rem" }}>Pending Orders</p>
                    <h4 style={{ fontSize: "1.5rem", color: "#b45309", margin: 0 }}>{orderStats?.pendingOrders || 0}</h4>
                    <p style={{ fontSize: "0.85rem", color: "#b45309", marginTop: "var(--spacing-1)" }}>${(orderStats?.pendingOrdersValue || 0).toFixed(2)}</p>
                  </div>
                  <div style={{ padding: "var(--spacing-4)", background: "#dbeafe", borderRadius: "var(--radius-base)" }}>
                    <p style={{ color: "var(--gray-600)", marginBottom: "var(--spacing-2)", fontSize: "0.9rem" }}>In Processing</p>
                    <h4 style={{ fontSize: "1.5rem", color: "#1e40af", margin: 0 }}>{orderStats?.processingOrders || 0}</h4>
                    <p style={{ fontSize: "0.85rem", color: "#1e40af", marginTop: "var(--spacing-1)" }}>${(orderStats?.processingOrdersValue || 0).toFixed(2)}</p>
                  </div>
                  <div style={{ padding: "var(--spacing-4)", background: "#fee2e2", borderRadius: "var(--radius-base)" }}>
                    <p style={{ color: "var(--gray-600)", marginBottom: "var(--spacing-2)", fontSize: "0.9rem" }}>Cancelled Orders</p>
                    <h4 style={{ fontSize: "1.5rem", color: "#991b1b", margin: 0 }}>{orderStats?.cancelledOrders || 0}</h4>
                    <p style={{ fontSize: "0.85rem", color: "#991b1b", marginTop: "var(--spacing-1)" }}>Not counted</p>
                  </div>
                </div>
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
                  <h3 style={{ marginBottom: "var(--spacing-4)" }}>{editingProduct ? "✏️ Edit Product" : "➕ Add New Product"}</h3>
                  <form onSubmit={editingProduct ? handleSaveProduct : handleAddProduct}>
                    <div style={{ marginBottom: "var(--spacing-4)", position: "relative" }}>
                      <label>Category *</label>
                      <input
                        type="text"
                        placeholder="Search or select category..."
                        value={categorySearch}
                        onChange={(e) => {
                          setCategorySearch(e.target.value);
                          setShowCategoryDropdown(true);
                        }}
                        onFocus={() => setShowCategoryDropdown(true)}
                        required={!productForm.categoryId}
                        style={{ width: "100%", padding: "var(--spacing-3) var(--spacing-4)", border: "2px solid var(--gray-200)", borderRadius: "var(--radius-base)", fontSize: "1rem" }}
                      />
                      {showCategoryDropdown && (
                        <div style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          background: "white",
                          border: "1px solid var(--gray-300)",
                          borderRadius: "var(--radius-base)",
                          marginTop: "var(--spacing-1)",
                          zIndex: 10,
                          maxHeight: "250px",
                          overflowY: "auto",
                          boxShadow: "var(--shadow-lg)",
                        }}>
                          {categories
                            .filter((cat) => cat.name.toLowerCase().includes(categorySearch.toLowerCase()))
                            .map((cat) => (
                              <div
                                key={cat.id}
                                onClick={() => {
                                  setProductForm({...productForm, categoryId: cat.id});
                                  setCategorySearch(cat.name);
                                  setShowCategoryDropdown(false);
                                }}
                                style={{
                                  padding: "var(--spacing-3) var(--spacing-4)",
                                  cursor: "pointer",
                                  borderBottom: "1px solid var(--gray-100)",
                                  transition: "background var(--transition-fast)",
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = "var(--primary-light)"}
                                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                              >
                                {cat.name}
                              </div>
                            ))}
                          {categories.filter((cat) => cat.name.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && (
                            <div style={{ padding: "var(--spacing-3) var(--spacing-4)", color: "var(--gray-600)", textAlign: "center" }}>
                              No categories found
                            </div>
                          )}
                        </div>
                      )}
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

                    <div style={{ marginBottom: "var(--spacing-6)", paddingBottom: "var(--spacing-6)", borderBottom: "2px solid var(--gray-200)" }}>
                      <label style={{ display: "block", marginBottom: "var(--spacing-3)" }}>📸 Product Images</label>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageSelect}
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "var(--spacing-3) var(--spacing-4)",
                          border: "2px dashed var(--primary)",
                          borderRadius: "var(--radius-base)",
                          cursor: "pointer",
                          marginBottom: "var(--spacing-4)",
                        }}
                      />
                      <p style={{ color: "var(--gray-600)", fontSize: "0.9rem", margin: 0 }}>
                        You can select multiple images. They will be displayed as product images.
                      </p>

                      {productImagePreviews.length > 0 && (
                        <div style={{ marginTop: "var(--spacing-4)" }}>
                          <p style={{ fontWeight: 600, marginBottom: "var(--spacing-2)" }}>
                            Selected Images ({productImagePreviews.length})
                          </p>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "var(--spacing-3)" }}>
                            {productImagePreviews.map((preview, idx) => (
                              <div key={idx} style={{ position: "relative", borderRadius: "var(--radius-base)", overflow: "hidden", background: "var(--gray-100)" }}>
                                <img
                                  src={preview}
                                  alt={`Preview ${idx + 1}`}
                                  style={{
                                    width: "100%",
                                    height: "100px",
                                    objectFit: "cover",
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeImage(idx)}
                                  style={{
                                    position: "absolute",
                                    top: "var(--spacing-2)",
                                    right: "var(--spacing-2)",
                                    background: "rgba(0, 0, 0, 0.6)",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "50%",
                                    width: "24px",
                                    height: "24px",
                                    cursor: "pointer",
                                    fontSize: "0.9rem",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "var(--spacing-4)" }}>
                      <button type="submit" className="btn-primary">{editingProduct ? "Update Product" : "Save Product"}</button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setShowAddProduct(false);
                          setEditingProduct(null);
                          setProductForm({ name: "", price: "", stock: "", description: "", categoryId: "" });
                          setProductImages([]);
                          setProductImagePreviews([]);
                          setCategorySearch("");
                        }}
                      >
                        Cancel
                      </button>
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
                        <th style={{ textAlign: "center", padding: "var(--spacing-4)", fontWeight: 700, color: "var(--gray-900)" }}>Actions</th>
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
                          <td style={{ padding: "var(--spacing-4)", textAlign: "center", display: "flex", gap: "var(--spacing-2)", justifyContent: "center" }}>
                            <button
                              onClick={() => startEditProduct(product)}
                              style={{
                                background: "var(--primary)",
                                color: "white",
                                border: "none",
                                padding: "var(--spacing-2) var(--spacing-3)",
                                borderRadius: "var(--radius-base)",
                                cursor: "pointer",
                                fontSize: "0.85rem",
                                fontWeight: 600,
                              }}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              style={{
                                background: "#fee2e2",
                                color: "var(--danger)",
                                border: "none",
                                padding: "var(--spacing-2) var(--spacing-3)",
                                borderRadius: "var(--radius-base)",
                                cursor: "pointer",
                                fontSize: "0.85rem",
                                fontWeight: 600,
                              }}
                            >
                              🗑️ Delete
                            </button>
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
                  <h3 style={{ marginBottom: "var(--spacing-4)" }}>
                    {editingCategory ? "Edit Category" : "Add New Category"}
                  </h3>
                  <form onSubmit={handleAddCategory}>
                    <div style={{ marginBottom: "var(--spacing-4)" }}>
                      <label>Category Name *</label>
                      <input type="text" value={categoryForm.name} onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})} required />
                    </div>
                    <div style={{ marginBottom: "var(--spacing-4)" }}>
                      <label>Description</label>
                      <textarea value={categoryForm.description} onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})} />
                    </div>
                    <div style={{ display: "flex", gap: "var(--spacing-4)" }}>
                      <button type="submit" className="btn-primary">
                        {editingCategory ? "Update Category" : "Save Category"}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setShowAddCategory(false);
                          setEditingCategory(null);
                          setCategoryForm({ name: "", description: "" });
                        }}
                      >
                        Cancel
                      </button>
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
                    <button
                      className="btn-primary"
                      onClick={() => {
                        setEditingCategory(null);
                        setCategoryForm({ name: "", description: "" });
                        setShowAddCategory(true);
                      }}
                    >
                      Add Category
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--spacing-6)" }}>
                  {categories.map((cat) => (
                    <div key={cat.id} className="card">
                      <h4 style={{ marginBottom: "var(--spacing-2)" }}>{cat.name}</h4>
                      <p style={{ color: "var(--gray-600)", marginBottom: "var(--spacing-6)", fontSize: "0.9rem" }}>
                        {cat.description || "No description provided"}
                      </p>
                      <div style={{ display: "flex", gap: "var(--spacing-2)" }}>
                        <button
                          type="button"
                          onClick={() => startEditCategory(cat)}
                          style={{
                            flex: 1,
                            padding: "var(--spacing-2) var(--spacing-3)",
                            background: "var(--primary)",
                            color: "white",
                            border: "none",
                            borderRadius: "var(--radius-base)",
                            cursor: "pointer",
                            fontWeight: 600,
                            fontSize: "0.9rem",
                            transition: "all var(--transition-fast)",
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "var(--primary-dark)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "var(--primary)"}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            console.log("Delete button clicked for:", cat.id);
                            handleDeleteCategory(cat.id);
                          }}
                          style={{
                            flex: 1,
                            padding: "var(--spacing-2) var(--spacing-3)",
                            background: "#fee2e2",
                            color: "var(--danger)",
                            border: "none",
                            borderRadius: "var(--radius-base)",
                            cursor: "pointer",
                            fontWeight: 600,
                            fontSize: "0.9rem",
                            transition: "all var(--transition-fast)",
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#fecaca"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "#fee2e2"}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "orders" && (
            <div>
              <h1 style={{ marginBottom: "var(--spacing-8)" }}>Orders & Revenue</h1>

              <div className="card" style={{ marginBottom: "var(--spacing-8)", background: "#f0fdf4", borderLeft: "4px solid #10b981", padding: "var(--spacing-4)" }}>
                <p style={{ margin: 0, color: "#166534", fontWeight: 600 }}>
                  💡 <strong>Revenue Tracking:</strong> Only delivered orders count towards revenue. Pending and in-process orders are tracked separately.
                </p>
              </div>

              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "var(--spacing-6)", marginBottom: "var(--spacing-8)" }}>
                <div className="card" style={{ borderLeft: "4px solid var(--primary)" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "var(--spacing-2)" }}>🛒</div>
                  <p style={{ color: "var(--gray-600)", marginBottom: "var(--spacing-1)" }}>Total Orders</p>
                  <h3 style={{ fontSize: "2rem", color: "var(--primary)", margin: 0 }}>{orders.length}</h3>
                </div>
                <div className="card" style={{ borderLeft: "4px solid #10b981" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "var(--spacing-2)" }}>✅</div>
                  <p style={{ color: "var(--gray-600)", marginBottom: "var(--spacing-1)" }}>Revenue (Delivered)</p>
                  <h3 style={{ fontSize: "2rem", color: "#10b981", margin: 0 }}>${(orderStats?.revenue || 0).toFixed(2)}</h3>
                </div>
                <div className="card" style={{ borderLeft: "4px solid #f59e0b" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "var(--spacing-2)" }}>⏳</div>
                  <p style={{ color: "var(--gray-600)", marginBottom: "var(--spacing-1)" }}>Pending Value</p>
                  <h3 style={{ fontSize: "2rem", color: "#f59e0b", margin: 0 }}>${(orderStats?.pendingOrdersValue || 0).toFixed(2)}</h3>
                </div>
                <div className="card" style={{ borderLeft: "4px solid #3b82f6" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "var(--spacing-2)" }}>📦</div>
                  <p style={{ color: "var(--gray-600)", marginBottom: "var(--spacing-1)" }}>Processing Value</p>
                  <h3 style={{ fontSize: "2rem", color: "#3b82f6", margin: 0 }}>${(orderStats?.processingOrdersValue || 0).toFixed(2)}</h3>
                </div>
              </div>

              {orders.length === 0 ? (
                <div className="card">
                  <div className="empty-state">
                    <div className="empty-state-icon">📦</div>
                    <h3 className="empty-state-title">No Orders Yet</h3>
                    <p className="empty-state-text">Orders will appear here once customers place them</p>
                  </div>
                </div>
              ) : (
                <div className="card">
                  <h3 style={{ marginBottom: "var(--spacing-6)" }}>Recent Orders</h3>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid var(--gray-200)" }}>
                          <th style={{ textAlign: "left", padding: "var(--spacing-4)", fontWeight: 700, color: "var(--gray-900)" }}>Order ID</th>
                          <th style={{ textAlign: "left", padding: "var(--spacing-4)", fontWeight: 700, color: "var(--gray-900)" }}>Customer</th>
                          <th style={{ textAlign: "left", padding: "var(--spacing-4)", fontWeight: 700, color: "var(--gray-900)" }}>Amount</th>
                          <th style={{ textAlign: "left", padding: "var(--spacing-4)", fontWeight: 700, color: "var(--gray-900)" }}>Status</th>
                          <th style={{ textAlign: "left", padding: "var(--spacing-4)", fontWeight: 700, color: "var(--gray-900)" }}>Date</th>
                          <th style={{ textAlign: "center", padding: "var(--spacing-4)", fontWeight: 700, color: "var(--gray-900)" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => (
                          <tr key={order.id} style={{ borderBottom: "1px solid var(--gray-200)" }}>
                            <td style={{ padding: "var(--spacing-4)", color: "var(--primary)", fontWeight: 600 }}>{order.orderNumber}</td>
                            <td style={{ padding: "var(--spacing-4)", color: "var(--gray-900)" }}>
                              {order.user.firstName} {order.user.lastName}
                            </td>
                            <td style={{ padding: "var(--spacing-4)", color: "var(--primary)", fontWeight: 600 }}>
                              ${Number(order.totalAmount).toFixed(2)}
                            </td>
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
                            <td style={{ padding: "var(--spacing-4)", color: "var(--gray-600)", fontSize: "0.9rem" }}>
                              {new Date(order.createdAt).toLocaleDateString()}
                            </td>
                            <td style={{ padding: "var(--spacing-4)", textAlign: "center", display: "flex", gap: "var(--spacing-2)", justifyContent: "center", fontSize: "0.85rem" }}>
                              <button
                                onClick={() => startEditOrder(order)}
                                style={{
                                  background: "var(--primary)",
                                  color: "white",
                                  border: "none",
                                  padding: "var(--spacing-2) var(--spacing-3)",
                                  borderRadius: "var(--radius-base)",
                                  cursor: "pointer",
                                  fontWeight: 600,
                                }}
                              >
                                📝 Edit
                              </button>
                              <button
                                onClick={() => handleDeleteOrder(order.id)}
                                style={{
                                  background: "#fee2e2",
                                  color: "var(--danger)",
                                  border: "none",
                                  padding: "var(--spacing-2) var(--spacing-3)",
                                  borderRadius: "var(--radius-base)",
                                  cursor: "pointer",
                                  fontWeight: 600,
                                }}
                              >
                                🗑️ Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Order Status Update Modal */}
                  {editingOrder && (
                    <div style={{ marginTop: "var(--spacing-8)", padding: "var(--spacing-6)", background: "#f0fdf4", borderRadius: "var(--radius-base)", borderLeft: "4px solid var(--success)" }}>
                      <h4 style={{ marginBottom: "var(--spacing-4)" }}>Update Order Status for {editingOrder.orderNumber}</h4>
                      <div style={{ marginBottom: "var(--spacing-4)" }}>
                        <label>Status</label>
                        <select
                          value={orderStatusUpdate}
                          onChange={(e) => setOrderStatusUpdate(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "var(--spacing-3) var(--spacing-4)",
                            border: "1px solid var(--gray-300)",
                            borderRadius: "var(--radius-base)",
                            fontSize: "1rem",
                            marginTop: "var(--spacing-2)",
                          }}
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                      <div style={{ display: "flex", gap: "var(--spacing-4)" }}>
                        <button onClick={handleUpdateOrderStatus} className="btn-primary">
                          Update Status
                        </button>
                        <button
                          onClick={() => setEditingOrder(null)}
                          className="btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <div>
              <h1 style={{ marginBottom: "var(--spacing-8)" }}>Store Settings</h1>

              <div className="card" style={{ maxWidth: "600px", marginBottom: "var(--spacing-8)" }}>
                <h3 style={{ marginBottom: "var(--spacing-6)" }}>Store Logo</h3>

                {storeLogoPreview && (
                  <div style={{ marginBottom: "var(--spacing-4)" }}>
                    <p style={{ fontSize: "0.9rem", color: "var(--gray-600)", marginBottom: "var(--spacing-2)" }}>Preview:</p>
                    <img
                      src={storeLogoPreview}
                      alt="Store Logo"
                      style={{
                        width: "150px",
                        height: "150px",
                        objectFit: "cover",
                        borderRadius: "var(--radius-lg)",
                        border: "2px solid var(--gray-200)",
                      }}
                    />
                  </div>
                )}

                <div style={{ marginBottom: "var(--spacing-4)" }}>
                  <label>Upload Store Logo/Thumbnail</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleStoreLogoSelect}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "var(--spacing-3) var(--spacing-4)",
                      border: "2px dashed var(--primary)",
                      borderRadius: "var(--radius-base)",
                      cursor: "pointer",
                    }}
                  />
                  <p style={{ color: "var(--gray-600)", fontSize: "0.9rem", marginTop: "var(--spacing-2)" }}>
                    This logo will be displayed on the store page
                  </p>
                </div>

                {storeLogoPreview && (
                  <button
                    type="button"
                    onClick={handleUpdateStoreLogo}
                    className="btn-primary"
                    style={{ width: "100%" }}
                  >
                    💾 Save Logo
                  </button>
                )}
              </div>

              <div className="card" style={{ maxWidth: "600px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-6)" }}>
                  <h3 style={{ margin: 0 }}>Store Information</h3>
                  {!isEditingStoreInfo && (
                    <button
                      type="button"
                      onClick={startEditStoreInfo}
                      className="btn-primary"
                      style={{ padding: "var(--spacing-2) var(--spacing-4)", fontSize: "0.9rem" }}
                    >
                      ✏️ Edit
                    </button>
                  )}
                </div>

                {isEditingStoreInfo ? (
                  <form onSubmit={handleUpdateStoreInfo}>
                    <div style={{ marginBottom: "var(--spacing-4)" }}>
                      <label>Store Name</label>
                      <input
                        type="text"
                        value={storeInfoForm.name}
                        onChange={(e) => setStoreInfoForm({ ...storeInfoForm, name: e.target.value })}
                        style={{ width: "100%", padding: "var(--spacing-3)", borderRadius: "var(--radius-base)", border: "1px solid var(--gray-300)" }}
                      />
                    </div>
                    <div style={{ marginBottom: "var(--spacing-4)" }}>
                      <label>Store Slug</label>
                      <input type="text" value={store?.slug || ""} readOnly style={{ background: "var(--gray-100)", width: "100%", padding: "var(--spacing-3)", borderRadius: "var(--radius-base)", border: "1px solid var(--gray-300)" }} />
                      <p style={{ fontSize: "0.85rem", color: "var(--gray-600)", margin: "var(--spacing-2) 0 0 0" }}>Slug cannot be changed</p>
                    </div>
                    <div style={{ marginBottom: "var(--spacing-4)" }}>
                      <label>Contact Email</label>
                      <input
                        type="email"
                        value={storeInfoForm.contactEmail}
                        onChange={(e) => setStoreInfoForm({ ...storeInfoForm, contactEmail: e.target.value })}
                        style={{ width: "100%", padding: "var(--spacing-3)", borderRadius: "var(--radius-base)", border: "1px solid var(--gray-300)" }}
                      />
                    </div>
                    <div style={{ marginBottom: "var(--spacing-4)" }}>
                      <label>Address</label>
                      <input
                        type="text"
                        value={storeInfoForm.address}
                        onChange={(e) => setStoreInfoForm({ ...storeInfoForm, address: e.target.value })}
                        placeholder="Store address"
                        style={{ width: "100%", padding: "var(--spacing-3)", borderRadius: "var(--radius-base)", border: "1px solid var(--gray-300)" }}
                      />
                    </div>
                    <div style={{ marginBottom: "var(--spacing-6)" }}>
                      <label>Contact Phone</label>
                      <input
                        type="text"
                        value={storeInfoForm.contactPhone}
                        onChange={(e) => setStoreInfoForm({ ...storeInfoForm, contactPhone: e.target.value })}
                        placeholder="Phone number"
                        style={{ width: "100%", padding: "var(--spacing-3)", borderRadius: "var(--radius-base)", border: "1px solid var(--gray-300)" }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: "var(--spacing-4)" }}>
                      <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                        💾 Save Changes
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingStoreInfo(false)}
                        className="btn-secondary"
                        style={{ flex: 1 }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div style={{ marginBottom: "var(--spacing-4)" }}>
                      <label style={{ fontWeight: 600, color: "var(--gray-700)" }}>Store Name</label>
                      <p style={{ margin: "var(--spacing-2) 0 0 0", fontSize: "1rem" }}>{store?.name || "Not set"}</p>
                    </div>
                    <div style={{ marginBottom: "var(--spacing-4)" }}>
                      <label style={{ fontWeight: 600, color: "var(--gray-700)" }}>Store Slug</label>
                      <p style={{ margin: "var(--spacing-2) 0 0 0", fontSize: "1rem", fontFamily: "monospace", color: "var(--primary)" }}>{store?.slug || "Not set"}</p>
                    </div>
                    <div style={{ marginBottom: "var(--spacing-4)" }}>
                      <label style={{ fontWeight: 600, color: "var(--gray-700)" }}>Contact Email</label>
                      <p style={{ margin: "var(--spacing-2) 0 0 0", fontSize: "1rem" }}>{store?.contactEmail || "Not set"}</p>
                    </div>
                    <div style={{ marginBottom: "var(--spacing-4)" }}>
                      <label style={{ fontWeight: 600, color: "var(--gray-700)" }}>Address</label>
                      <p style={{ margin: "var(--spacing-2) 0 0 0", fontSize: "1rem" }}>{store?.address || "Not set"}</p>
                    </div>
                    <div>
                      <label style={{ fontWeight: 600, color: "var(--gray-700)" }}>Contact Phone</label>
                      <p style={{ margin: "var(--spacing-2) 0 0 0", fontSize: "1rem" }}>{store?.contactPhone || "Not set"}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
