"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export const dynamic = "force-dynamic";

interface Product {
  id: string;
  name: string;
  description: string;
  price: string | number;
  sku: string;
  imageUrls?: string | string[];
  category?: {
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
}

export default function StorePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          fetch(`http://localhost:3001/api/v1/tenants/${slug}/products`),
          fetch(`http://localhost:3001/api/v1/tenants/${slug}/categories`),
        ]);

        const productsData = await productsRes.json();
        const categoriesData = await categoriesRes.json();

        setProducts(Array.isArray(productsData) ? productsData : []);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load products");
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  const filteredProducts = products
    .filter((p) => !selectedCategory || p.category?.name === selectedCategory)
    .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const addToCart = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setCart((prev) => {
      const updated = {
        ...prev,
        [productId]: (prev[productId] || 0) + 1,
      };
      // Save cart to localStorage with product details
      const cartWithProducts = Object.entries(updated).map(([pId, qty]) => {
        const prod = products.find((p) => p.id === pId);
        return {
          id: pId,
          name: prod?.name || "Unknown",
          price: Number(prod?.price || 0),
          quantity: qty,
        };
      });
      localStorage.setItem(`cart_${slug}`, JSON.stringify(cartWithProducts));
      return updated;
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const updated = { ...prev };
      if (updated[productId] > 1) {
        updated[productId]--;
      } else {
        delete updated[productId];
      }
      // Save cart to localStorage with product details
      const cartWithProducts = Object.entries(updated).map(([pId, qty]) => {
        const prod = products.find((p) => p.id === pId);
        return {
          id: pId,
          name: prod?.name || "Unknown",
          price: Number(prod?.price || 0),
          quantity: qty,
        };
      });
      localStorage.setItem(`cart_${slug}`, JSON.stringify(cartWithProducts));
      return updated;
    });
  };

  useEffect(() => {
    // Load cart from localStorage on component mount
    const savedCart = localStorage.getItem(`cart_${slug}`);
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error("Failed to load cart from localStorage");
      }
    }
  }, [slug]);

  const cartItemCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = filteredProducts
    .filter((p) => cart[p.id])
    .reduce((sum, p) => sum + Number(p.price) * (cart[p.id] || 0), 0);

  return (
    <main className="min-h-screen" style={{ background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)" }}>
      {/* Header */}
      <header>
        <div className="container">
          <Link href="/">
            <div className="logo">
              <span>🛒</span>
              <span>Grocio</span>
            </div>
          </Link>
          <div className="nav">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "300px",
                padding: "var(--spacing-3) var(--spacing-4)",
                borderRadius: "var(--radius-lg)",
                border: "2px solid var(--gray-200)",
                fontSize: "1rem",
              }}
            />
            <Link href={`/cart?slug=${slug}`}>
              <button style={{ position: "relative" }} className="btn-primary">
                <span>🛒 Cart</span>
                {cartItemCount > 0 && (
                  <div className="cart-badge">{cartItemCount}</div>
                )}
              </button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container py-12">
        {/* Page Header */}
        <div style={{ marginBottom: "var(--spacing-12)" }}>
          <h1 style={{ marginBottom: "var(--spacing-2)" }}>
            {slug.replace(/-/g, " ").toUpperCase()}
          </h1>
          <p style={{ fontSize: "1.1rem", color: "var(--gray-600)" }}>
            Discover our premium selection of fresh & quality products
          </p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: "var(--spacing-8)" }}>
            <span>⚠️</span>
            <div>
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {loading ? (
          <div className="empty-state">
            <div className="empty-state-icon">⏳</div>
            <h3 className="empty-state-title">Loading Store</h3>
            <p className="empty-state-text">Fetching products from our catalog...</p>
          </div>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: "280px 1fr", gap: "var(--spacing-8)" }}>
            {/* Sidebar - Categories */}
            <div>
              <aside className="sidebar">
                <h3 className="sidebar-title">Categories</h3>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`filter-item ${selectedCategory === null ? "active" : ""}`}
                >
                  <span>🏷️</span> All Products
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`filter-item ${selectedCategory === cat.name ? "active" : ""}`}
                  >
                    <span>{cat.name === "Produce" ? "🥕" : cat.name === "Dairy" ? "🥛" : "🥩"}</span> {cat.name}
                  </button>
                ))}
              </aside>
            </div>

            {/* Main - Products */}
            <div>
              {filteredProducts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📦</div>
                  <h3 className="empty-state-title">No Products Found</h3>
                  <p className="empty-state-text">
                    {searchTerm
                      ? `No results for "${searchTerm}". Try a different search.`
                      : "This category is currently empty."}
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: "var(--spacing-6)" }}>
                    <p style={{ color: "var(--gray-600)", fontSize: "0.95rem" }}>
                      Showing <strong>{filteredProducts.length}</strong> products
                    </p>
                  </div>

                  <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                    {filteredProducts.map((product) => {
                      let imageUrls: string[] = [];
                      if (product.imageUrls) {
                        imageUrls = typeof product.imageUrls === "string" ? JSON.parse(product.imageUrls) : product.imageUrls;
                      }
                      const productImage = imageUrls && imageUrls.length > 0 ? imageUrls[0] : null;

                      return (
                        <div key={product.id} className="product-card animate-slideIn">
                          <div className="product-image" style={{ overflow: "hidden", backgroundColor: "var(--gray-100)" }}>
                            {productImage ? (
                              <img
                                src={productImage}
                                alt={product.name}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  display: "block",
                                }}
                                onError={(e) => {
                                  // Fallback to emoji if image fails to load
                                  e.currentTarget.style.display = "none";
                                  e.currentTarget.parentElement!.textContent =
                                    product.category?.name === "Produce"
                                      ? "🥕"
                                      : product.category?.name === "Dairy"
                                        ? "🥛"
                                        : "🥩";
                                }}
                              />
                            ) : (
                              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem" }}>
                                {product.category?.name === "Produce"
                                  ? "🥕"
                                  : product.category?.name === "Dairy"
                                    ? "🥛"
                                    : "🥩"}
                              </div>
                            )}
                          </div>
                          <div className="product-info">
                            <div className="product-category">{product.category?.name || "General"}</div>
                            <h3 className="product-name">{product.name}</h3>
                            <p className="product-description">
                              {product.description || "Quality product for your daily needs"}
                            </p>

                            <div className="product-footer">
                              <span className="product-price">${Number(product.price).toFixed(2)}</span>
                              <div className="product-actions">
                                {cart[product.id] ? (
                                  <div className="qty-control">
                                    <button onClick={() => removeFromCart(product.id)}>−</button>
                                    <input type="text" className="qty-display" value={cart[product.id]} readOnly />
                                    <button onClick={() => addToCart(product.id)}>+</button>
                                  </div>
                                ) : (
                                  <button onClick={() => addToCart(product.id)} className="btn-primary" style={{ padding: "var(--spacing-2) var(--spacing-4)" }}>
                                    Add
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Cart Summary Floating Card */}
                  {cartItemCount > 0 && (
                    <div
                      style={{
                        marginTop: "var(--spacing-16)",
                        padding: "var(--spacing-8)",
                        background: "white",
                        borderRadius: "var(--radius-lg)",
                        boxShadow: "var(--shadow-lg)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderLeft: "4px solid var(--primary)",
                      }}
                    >
                      <div>
                        <p style={{ color: "var(--gray-600)", marginBottom: "var(--spacing-2)" }}>
                          Items in Cart: <strong>{cartItemCount}</strong>
                        </p>
                        <h3 style={{ fontSize: "2rem", color: "var(--primary)", margin: 0 }}>
                          ${cartTotal ? cartTotal.toFixed(2) : "0.00"}
                        </h3>
                      </div>
                      <Link href={`/cart?slug=${slug}`}>
                        <button className="btn-primary" style={{ padding: "var(--spacing-4) var(--spacing-8)", fontSize: "1.1rem" }}>
                          Proceed to Checkout →
                        </button>
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{ marginTop: "var(--spacing-16)" }}>
        <div className="container">
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
            <div>
              <h4 style={{ color: "white", marginBottom: "var(--spacing-4)" }}>About Grocio</h4>
              <p>Your trusted online grocery store delivering fresh products right to your doorstep.</p>
            </div>
            <div>
              <h4 style={{ color: "white", marginBottom: "var(--spacing-4)" }}>Quick Links</h4>
              <ul style={{ listStyle: "none" }}>
                <li><Link href="/">Home</Link></li>
                <li><Link href={`/store/${slug}`}>Shop</Link></li>
                <li><Link href={`/cart?slug=${slug}`}>Cart</Link></li>
              </ul>
            </div>
            <div>
              <h4 style={{ color: "white", marginBottom: "var(--spacing-4)" }}>Support</h4>
              <ul style={{ listStyle: "none" }}>
                <li><a href="#">Help Center</a></li>
                <li><a href="#">Contact Us</a></li>
                <li><a href="#">Shipping Info</a></li>
              </ul>
            </div>
          </div>
          <div style={{ marginTop: "var(--spacing-8)", paddingTop: "var(--spacing-8)", borderTop: "1px solid rgba(255,255,255,0.1)", textAlign: "center", color: "var(--gray-400)" }}>
            <p>&copy; 2026 Grocio. All rights reserved. | Powered by Advanced E-Commerce Platform</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
