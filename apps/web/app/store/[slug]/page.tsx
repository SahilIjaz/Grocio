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
  unit?: string;
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
  const [sortBy, setSortBy] = useState<"name" | "price-low" | "price-high">("name");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const productsUrl = `${process.env.NEXT_PUBLIC_API_URL}/tenants/${slug}/products`;
        const categoriesUrl = `${process.env.NEXT_PUBLIC_API_URL}/tenants/${slug}/categories`;

        const [productsRes, categoriesRes] = await Promise.all([
          fetch(productsUrl),
          fetch(categoriesUrl),
        ]);

        if (!productsRes.ok || !categoriesRes.ok) {
          throw new Error("Failed to load data");
        }

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

    if (slug) fetchData();
  }, [slug]);

  const filteredProducts = products
    .filter((p) => !selectedCategory || p.category?.name === selectedCategory)
    .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "price-low") return Number(a.price) - Number(b.price);
      if (sortBy === "price-high") return Number(b.price) - Number(a.price);
      return a.name.localeCompare(b.name);
    });

  useEffect(() => {
    const savedCart = localStorage.getItem(`cart_${slug}`);
    if (savedCart) {
      try {
        const cartData = JSON.parse(savedCart);
        if (Array.isArray(cartData)) {
          const cartObj: Record<string, number> = {};
          cartData.forEach((item: any) => {
            if (item.id && item.quantity) cartObj[item.id] = item.quantity;
          });
          setCart(cartObj);
        } else {
          setCart(cartData);
        }
      } catch (e) {
        console.error("Failed to load cart");
      }
    }
  }, [slug]);

  const addToCart = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setCart((prev) => {
      const updated = { ...prev, [productId]: (prev[productId] || 0) + 1 };
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

  const cartItemCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = filteredProducts
    .filter((p) => cart[p.id])
    .reduce((sum, p) => sum + Number(p.price) * (cart[p.id] || 0), 0);

  const getImageUrl = (product: Product): string | null => {
    if (!product.imageUrls) return null;
    try {
      const imageUrls = typeof product.imageUrls === "string"
        ? (product.imageUrls.startsWith('[') ? JSON.parse(product.imageUrls) : [product.imageUrls])
        : Array.isArray(product.imageUrls) ? product.imageUrls : [];
      return imageUrls?.[0] || null;
    } catch {
      return null;
    }
  };

  const truncateText = (text: string, lines: number = 2): string => {
    const lineArray = text.split('\n').slice(0, lines);
    return lineArray.join('\n').substring(0, 80) + (text.length > 80 ? '...' : '');
  };

  return (
    <main className="min-h-screen" style={{ background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)" }}>
      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 100, backgroundColor: "white", boxShadow: "var(--shadow-md)" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--spacing-3) var(--spacing-4)", gap: "var(--spacing-4)", flexWrap: "wrap" }}>
          <Link href="/">
            <div className="logo" style={{ cursor: "pointer", minWidth: "fit-content" }}>
              <span>🛒</span>
              <span>Grocio</span>
            </div>
          </Link>
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: "1 1 200px",
              minWidth: "150px",
              maxWidth: "400px",
              padding: "var(--spacing-3) var(--spacing-4)",
              borderRadius: "var(--radius-lg)",
              border: "2px solid var(--gray-200)",
              fontSize: "1rem",
            }}
          />
          <Link href={`/cart?slug=${slug}`}>
            <button style={{ position: "relative", minWidth: "100px" }} className="btn-primary">
              <span>🛒 Cart</span>
              {cartItemCount > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "-8px",
                    right: "-8px",
                    backgroundColor: "var(--danger)",
                    color: "white",
                    borderRadius: "50%",
                    width: "24px",
                    height: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                  }}
                >
                  {cartItemCount}
                </div>
              )}
            </button>
          </Link>
        </div>
      </header>

      {/* Promotional Banner */}
      {!error && (
        <div style={{
          backgroundColor: "var(--primary)",
          color: "white",
          padding: "var(--spacing-4)",
          textAlign: "center",
          fontSize: "0.95rem",
          fontWeight: "500",
        }}>
          🎉 Free delivery on orders over $50 | Fresh products delivered daily
        </div>
      )}

      <div className="container py-12">
        {/* Breadcrumb */}
        <div style={{ marginBottom: "var(--spacing-6)", fontSize: "0.9rem", color: "var(--gray-600)" }}>
          <Link href="/" style={{ color: "var(--primary)", textDecoration: "none" }}>
            Grocio
          </Link>
          {" > "}
          <span style={{ fontWeight: "500" }}>{slug.replace(/-/g, " ").charAt(0).toUpperCase() + slug.replace(/-/g, " ").slice(1)}</span>
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
          </div>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: "250px 1fr", gap: "var(--spacing-8)", alignItems: "start" }}>
            {/* Sidebar - Categories */}
            <div>
              <aside className="sidebar" style={{ position: "sticky", top: "180px" }}>
                <h3 className="sidebar-title">Categories</h3>
                <button
                  onClick={() => setSelectedCategory(null)}
                  style={{
                    width: "100%",
                    padding: "var(--spacing-3) var(--spacing-4)",
                    marginBottom: "var(--spacing-2)",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: selectedCategory === null ? "#d1fae5" : "var(--gray-100)",
                    color: selectedCategory === null ? "var(--success)" : "var(--gray-700)",
                    textAlign: "left",
                    cursor: "pointer",
                    fontWeight: selectedCategory === null ? "600" : "500",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (selectedCategory !== null) e.currentTarget.style.backgroundColor = "#f3f4f6";
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCategory !== null) e.currentTarget.style.backgroundColor = "var(--gray-100)";
                  }}
                >
                  All Products
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.name)}
                    style={{
                      width: "100%",
                      padding: "var(--spacing-3) var(--spacing-4)",
                      marginBottom: "var(--spacing-2)",
                      border: "none",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: selectedCategory === cat.name ? "#d1fae5" : "var(--gray-100)",
                      color: selectedCategory === cat.name ? "var(--success)" : "var(--gray-700)",
                      textAlign: "left",
                      cursor: "pointer",
                      fontWeight: selectedCategory === cat.name ? "600" : "500",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (selectedCategory !== cat.name) e.currentTarget.style.backgroundColor = "#f3f4f6";
                    }}
                    onMouseLeave={(e) => {
                      if (selectedCategory !== cat.name) e.currentTarget.style.backgroundColor = "var(--gray-100)";
                    }}
                  >
                    {cat.name}
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
                  {/* Toolbar */}
                  <div style={{
                    marginBottom: "var(--spacing-8)",
                    padding: "var(--spacing-4)",
                    backgroundColor: "white",
                    borderRadius: "var(--radius-lg)",
                    boxShadow: "var(--shadow-sm)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}>
                    <p style={{ color: "var(--gray-600)", fontSize: "0.95rem", margin: 0 }}>
                      Showing <strong>{filteredProducts.length}</strong> products
                    </p>
                    <div style={{ display: "flex", gap: "var(--spacing-4)", alignItems: "center" }}>
                      <div style={{ display: "flex", gap: "var(--spacing-2)", alignItems: "center" }}>
                        <label style={{ fontSize: "0.9rem", fontWeight: "500", color: "var(--gray-700)" }}>Sort:</label>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as "name" | "price-low" | "price-high")}
                          style={{
                            padding: "var(--spacing-2) var(--spacing-3)",
                            borderRadius: "var(--radius-md)",
                            border: "2px solid var(--gray-200)",
                            fontSize: "0.9rem",
                            cursor: "pointer",
                            backgroundColor: "white",
                          }}
                        >
                          <option value="name">Name (A-Z)</option>
                          <option value="price-low">Price: Low to High</option>
                          <option value="price-high">Price: High to Low</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Product Grid */}
                  <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "var(--spacing-6)" }}>
                    {filteredProducts.map((product) => {
                      const imageUrl = getImageUrl(product);
                      const inCart = cart[product.id] || 0;

                      return (
                        <div
                          key={product.id}
                          style={{
                            backgroundColor: "white",
                            borderRadius: "var(--radius-lg)",
                            overflow: "hidden",
                            boxShadow: "var(--shadow-sm)",
                            display: "flex",
                            flexDirection: "column",
                            height: "100%",
                            transition: "transform 0.2s, box-shadow 0.2s",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-4px)";
                            e.currentTarget.style.boxShadow = "var(--shadow-lg)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                          }}
                        >
                          {/* Product Image */}
                          <div style={{
                            backgroundColor: "#f3f4f6",
                            height: "200px",
                            overflow: "hidden",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}>
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={product.name}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  e.currentTarget.parentElement!.innerHTML =
                                    '<div style="color: var(--gray-400);">No Image</div>';
                                }}
                              />
                            ) : (
                              <div style={{ color: "var(--gray-400)" }}>No Image</div>
                            )}
                          </div>

                          {/* Product Info */}
                          <div style={{ padding: "var(--spacing-4)", flexGrow: 1, display: "flex", flexDirection: "column" }}>
                            <div style={{
                              fontSize: "0.8rem",
                              color: "var(--success)",
                              fontWeight: "600",
                              marginBottom: "var(--spacing-2)",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}>
                              {product.category?.name || "General"}
                            </div>

                            <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "var(--spacing-2)", margin: "0 0 var(--spacing-2) 0", minHeight: "1.5rem" }}>
                              {product.name}
                            </h3>

                            <p style={{
                              fontSize: "0.85rem",
                              color: "var(--gray-600)",
                              marginBottom: "var(--spacing-4)",
                              height: "2.4em",
                              overflow: "hidden",
                              display: "-webkit-box",
                              WebkitBoxOrient: "vertical",
                              WebkitLineClamp: 2,
                              margin: "0 0 var(--spacing-4) 0",
                              lineHeight: "1.2",
                            }}>
                              {truncateText(product.description, 2)}
                            </p>

                            <div style={{ marginTop: "auto" }}>
                              <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "var(--spacing-3)",
                              }}>
                                <span style={{
                                  fontSize: "1.3rem",
                                  fontWeight: "bold",
                                  color: "var(--primary)",
                                }}>
                                  ${Number(product.price).toFixed(2)}
                                </span>
                                <span style={{
                                  fontSize: "0.8rem",
                                  color: "var(--gray-500)",
                                  fontStyle: "italic",
                                }}>
                                  / {product.unit || "unit"}
                                </span>
                              </div>

                              <div style={{ display: "flex", gap: "var(--spacing-2)" }}>
                                <Link href={`/store/${slug}/product/${product.id}`} style={{ flex: 1, textDecoration: "none" }}>
                                  <button style={{
                                    width: "100%",
                                    padding: "var(--spacing-2) var(--spacing-3)",
                                    backgroundColor: "var(--gray-100)",
                                    color: "var(--gray-700)",
                                    border: "none",
                                    borderRadius: "var(--radius-md)",
                                    fontSize: "0.85rem",
                                    cursor: "pointer",
                                    fontWeight: "500",
                                    transition: "all 0.2s",
                                  }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = "var(--gray-200)";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = "var(--gray-100)";
                                    }}
                                  >
                                    Details
                                  </button>
                                </Link>

                                {inCart > 0 ? (
                                  <div style={{
                                    flex: 1,
                                    display: "flex",
                                    alignItems: "center",
                                    border: "2px solid var(--primary)",
                                    borderRadius: "var(--radius-md)",
                                    overflow: "hidden",
                                  }}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeFromCart(product.id);
                                      }}
                                      style={{
                                        flex: 1,
                                        padding: "var(--spacing-1)",
                                        border: "none",
                                        background: "none",
                                        cursor: "pointer",
                                        fontSize: "0.9rem",
                                        color: "var(--primary)",
                                        fontWeight: "bold",
                                      }}
                                    >
                                      −
                                    </button>
                                    <span style={{
                                      flex: 1,
                                      textAlign: "center",
                                      fontSize: "0.9rem",
                                      fontWeight: "600",
                                      color: "var(--primary)",
                                    }}>
                                      {inCart}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        addToCart(product.id);
                                      }}
                                      style={{
                                        flex: 1,
                                        padding: "var(--spacing-1)",
                                        border: "none",
                                        background: "none",
                                        cursor: "pointer",
                                        fontSize: "0.9rem",
                                        color: "var(--primary)",
                                        fontWeight: "bold",
                                      }}
                                    >
                                      +
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      addToCart(product.id);
                                    }}
                                    className="btn-primary"
                                    style={{
                                      flex: 1,
                                      padding: "var(--spacing-2) var(--spacing-3)",
                                      fontSize: "0.9rem",
                                      fontWeight: "600",
                                      border: "none",
                                      cursor: "pointer",
                                    }}
                                  >
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

                  {/* Cart Summary Card */}
                  {cartItemCount > 0 && (
                    <div style={{
                      marginTop: "var(--spacing-16)",
                      padding: "var(--spacing-8)",
                      background: "white",
                      borderRadius: "var(--radius-lg)",
                      boxShadow: "var(--shadow-lg)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderLeft: "4px solid var(--primary)",
                    }}>
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
