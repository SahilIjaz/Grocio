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
  stockQuantity: number;
  unit: string;
  imageUrls?: string | string[];
  category?: {
    name: string;
  };
}

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const productId = params.productId as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const url = `http://localhost:3001/api/v1/products/${productId}`;
        const res = await fetch(url);

        if (!res.ok) {
          throw new Error("Failed to load product");
        }

        const data = await res.json();
        setProduct(data);
        setLoading(false);
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err instanceof Error ? err.message : "Failed to load product");
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  useEffect(() => {
    // Load cart from localStorage
    const savedCart = localStorage.getItem(`cart_${slug}`);
    if (savedCart) {
      try {
        const cartData = JSON.parse(savedCart);
        if (Array.isArray(cartData)) {
          const cartObj: Record<string, number> = {};
          cartData.forEach((item: any) => {
            if (item.id && item.quantity) {
              cartObj[item.id] = item.quantity;
            }
          });
          setCart(cartObj);
        } else {
          setCart(cartData);
        }
      } catch (e) {
        console.error("Failed to load cart from localStorage");
      }
    }
  }, [slug]);

  const addToCart = () => {
    if (!product) return;

    setCart((prev) => {
      const updated = {
        ...prev,
        [product.id]: (prev[product.id] || 0) + quantity,
      };

      const cartWithProducts = Object.entries(updated).map(([pId, qty]) => {
        if (pId === product.id) {
          return {
            id: product.id,
            name: product.name,
            price: Number(product.price),
            quantity: qty,
          };
        }
        return { id: pId, quantity: qty };
      });

      localStorage.setItem(`cart_${slug}`, JSON.stringify(cartWithProducts));
      return updated;
    });

    // Show success message
    alert(`${quantity} ${product.name}(s) added to cart!`);
    setQuantity(1);
  };

  const getImageUrl = (): string | null => {
    if (!product?.imageUrls) return null;

    let imageUrls: string[] = [];
    if (product.imageUrls) {
      try {
        imageUrls = typeof product.imageUrls === "string"
          ? (product.imageUrls.startsWith('[') ? JSON.parse(product.imageUrls) : [product.imageUrls])
          : Array.isArray(product.imageUrls) ? product.imageUrls : [];
      } catch (e) {
        imageUrls = [];
      }
    }

    return imageUrls && imageUrls.length > 0 && imageUrls[0] ? imageUrls[0] : null;
  };

  if (loading) {
    return (
      <main className="min-h-screen" style={{ background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)" }}>
        <header>
          <div className="container">
            <Link href="/">
              <div className="logo">
                <span>🛒</span>
                <span>Grocio</span>
              </div>
            </Link>
          </div>
        </header>
        <div className="container py-12">
          <div className="empty-state">
            <div className="empty-state-icon">⏳</div>
            <h3 className="empty-state-title">Loading Product</h3>
          </div>
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="min-h-screen" style={{ background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)" }}>
        <header>
          <div className="container">
            <Link href="/">
              <div className="logo">
                <span>🛒</span>
                <span>Grocio</span>
              </div>
            </Link>
          </div>
        </header>
        <div className="container py-12">
          <div className="alert alert-error">
            <span>⚠️</span>
            <div>
              <strong>Error:</strong> {error || "Product not found"}
            </div>
          </div>
          <Link href={`/store/${slug}`}>
            <button className="btn-primary" style={{ marginTop: "var(--spacing-4)" }}>
              ← Back to Store
            </button>
          </Link>
        </div>
      </main>
    );
  }

  const imageUrl = getImageUrl();
  const inStock = product.stockQuantity > 0;

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
            <Link href={`/cart?slug=${slug}`}>
              <button className="btn-primary">
                <span>🛒 Cart</span>
              </button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container py-12">
        {/* Breadcrumb */}
        <div style={{ marginBottom: "var(--spacing-6)", fontSize: "0.9rem", color: "var(--gray-600)" }}>
          <Link href={`/store/${slug}`} style={{ color: "var(--primary)", textDecoration: "none" }}>
            Store
          </Link>
          {" / "}
          <Link href={`/store/${slug}`} style={{ color: "var(--primary)", textDecoration: "none" }}>
            {product.category?.name || "Products"}
          </Link>
          {" / "}
          <span>{product.name}</span>
        </div>

        {/* Product Detail Section */}
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-12)", alignItems: "start" }}>
          {/* Left: Product Image */}
          <div style={{ backgroundColor: "white", borderRadius: "var(--radius-lg)", padding: "var(--spacing-8)", boxShadow: "var(--shadow-md)" }}>
            <div style={{
              backgroundColor: "var(--gray-100)",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
              aspectRatio: "1 / 1",
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
                    e.currentTarget.parentElement!.innerHTML = '<div style="color: var(--gray-400);">No Image Available</div>';
                  }}
                />
              ) : (
                <div style={{ color: "var(--gray-400)" }}>No Image Available</div>
              )}
            </div>
          </div>

          {/* Right: Product Details */}
          <div style={{ backgroundColor: "white", borderRadius: "var(--radius-lg)", padding: "var(--spacing-8)", boxShadow: "var(--shadow-md)" }}>
            {/* Category Badge */}
            <div style={{ marginBottom: "var(--spacing-4)" }}>
              <span style={{
                display: "inline-block",
                backgroundColor: "var(--primary-light)",
                color: "var(--primary)",
                padding: "var(--spacing-2) var(--spacing-4)",
                borderRadius: "var(--radius-full)",
                fontSize: "0.85rem",
                fontWeight: "600",
              }}>
                {product.category?.name || "General"}
              </span>
            </div>

            {/* Product Name */}
            <h1 style={{ marginBottom: "var(--spacing-4)", fontSize: "2.5rem", fontWeight: "bold" }}>
              {product.name}
            </h1>

            {/* Price */}
            <div style={{ marginBottom: "var(--spacing-6)" }}>
              <p style={{ fontSize: "2rem", color: "var(--primary)", fontWeight: "bold", margin: 0 }}>
                ${Number(product.price).toFixed(2)}
                <span style={{ fontSize: "0.9rem", color: "var(--gray-600)", marginLeft: "var(--spacing-2)" }}>
                  / {product.unit || "unit"}
                </span>
              </p>
            </div>

            {/* Stock Status */}
            <div style={{ marginBottom: "var(--spacing-6)" }}>
              {inStock ? (
                <p style={{ color: "var(--success)", fontWeight: "600" }}>
                  ✓ In Stock ({product.stockQuantity} available)
                </p>
              ) : (
                <p style={{ color: "var(--danger)", fontWeight: "600" }}>
                  ✗ Out of Stock
                </p>
              )}
            </div>

            {/* Description */}
            <div style={{ marginBottom: "var(--spacing-8)", paddingBottom: "var(--spacing-8)", borderBottom: "1px solid var(--gray-200)" }}>
              <h3 style={{ marginBottom: "var(--spacing-3)", fontWeight: "600" }}>Description</h3>
              <p style={{ color: "var(--gray-700)", lineHeight: "1.6" }}>
                {product.description || "High-quality product for your daily needs."}
              </p>
            </div>

            {/* Product Details */}
            <div style={{ marginBottom: "var(--spacing-8)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-6)" }}>
              <div>
                <p style={{ color: "var(--gray-600)", fontSize: "0.9rem", marginBottom: "var(--spacing-2)" }}>
                  SKU
                </p>
                <p style={{ fontWeight: "600" }}>{product.sku}</p>
              </div>
              <div>
                <p style={{ color: "var(--gray-600)", fontSize: "0.9rem", marginBottom: "var(--spacing-2)" }}>
                  Category
                </p>
                <p style={{ fontWeight: "600" }}>{product.category?.name || "General"}</p>
              </div>
            </div>

            {/* Quantity Selector & Add to Cart */}
            {inStock && (
              <div style={{ display: "flex", gap: "var(--spacing-4)" }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  border: "2px solid var(--gray-300)",
                  borderRadius: "var(--radius-md)",
                  overflow: "hidden",
                }}>
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    style={{
                      padding: "var(--spacing-3) var(--spacing-4)",
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      fontSize: "1.2rem",
                      color: "var(--gray-600)",
                    }}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{
                      width: "60px",
                      textAlign: "center",
                      border: "none",
                      fontSize: "1rem",
                      fontWeight: "600",
                    }}
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    style={{
                      padding: "var(--spacing-3) var(--spacing-4)",
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      fontSize: "1.2rem",
                      color: "var(--gray-600)",
                    }}
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={addToCart}
                  className="btn-primary"
                  style={{ flex: 1, padding: "var(--spacing-3) var(--spacing-6)", fontSize: "1rem", fontWeight: "600" }}
                >
                  Add to Cart
                </button>
              </div>
            )}

            {/* Back to Store Link */}
            <div style={{ marginTop: "var(--spacing-8)" }}>
              <Link href={`/store/${slug}`} style={{ color: "var(--primary)", textDecoration: "none", fontWeight: "600" }}>
                ← Back to Store
              </Link>
            </div>
          </div>
        </div>
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
