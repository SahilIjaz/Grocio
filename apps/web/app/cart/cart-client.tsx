"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface User {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

export default function CartClient() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug") || "demo-grocery";

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    deliveryAddress: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Load cart from localStorage on mount (client side only)
  useEffect(() => {
    setMounted(true);
    const savedCart = localStorage.getItem(`cart_${slug}`);
    if (savedCart) {
      try {
        const cartData = JSON.parse(savedCart);
        // Handle both old format (object) and new format (array)
        if (Array.isArray(cartData)) {
          const validItems = cartData.filter((item: any) => item && item.id && item.name && item.price !== undefined && item.quantity);
          setCartItems(validItems as CartItem[]);
        } else if (typeof cartData === "object") {
          // Convert old format to new format if needed
          setCartItems(
            Object.entries(cartData).map(([id, qty]) => ({
              id,
              name: `Product ${id}`,
              price: 0,
              quantity: qty as number,
            }))
          );
        }
      } catch (e) {
        console.error("Failed to load cart from localStorage", e);
        setCartItems([]);
      }
    }
  }, [slug]);

  // Load user from localStorage on mount
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
        // Pre-fill form with user data
        const userData = JSON.parse(userStr);
        setFormData((prev) => ({
          ...prev,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
        }));
      } catch (e) {
        console.error("Failed to load user");
      }
    }
  }, []);

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = total * 0.08;
  const shipping = total > 0 ? 5 : 0;
  const grandTotal = total + tax + shipping;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if user is logged in
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/v1/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          deliveryAddress: formData.deliveryAddress,
          items: cartItems,
          tenantSlug: slug,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to create order";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      setSuccess(true);
      setCartItems([]);
      localStorage.removeItem(`cart_${slug}`);
      setTimeout(() => {
        window.location.href = "/";
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = (itemId: string) => {
    setCartItems((prev) => {
      const updated = prev.filter((item) => item.id !== itemId);
      localStorage.setItem(`cart_${slug}`, JSON.stringify(updated));
      return updated;
    });
  };

  const increaseQuantity = (itemId: string) => {
    setCartItems((prev) => {
      const updated = prev.map((item) =>
        item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item
      );
      localStorage.setItem(`cart_${slug}`, JSON.stringify(updated));
      return updated;
    });
  };

  const decreaseQuantity = (itemId: string) => {
    setCartItems((prev) => {
      const updated = prev.map((item) =>
        item.id === itemId && item.quantity > 1 ? { ...item, quantity: item.quantity - 1 } : item
      );
      localStorage.setItem(`cart_${slug}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (authMode === "login") {
        // Login
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/v1/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        });

        if (!response.ok) {
          throw new Error("Invalid email or password");
        }

        const userData = await response.json();
        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
        setShowAuthModal(false);
      } else {
        // Signup
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/v1/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            firstName: formData.firstName,
            lastName: formData.lastName,
            role: "customer",
          }),
        });

        if (!response.ok) {
          throw new Error("Signup failed");
        }

        const userData = await response.json();
        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
        setShowAuthModal(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
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

        <div className="container py-12" style={{ textAlign: "center" }}>
          <div className="card" style={{ maxWidth: "600px", margin: "0 auto" }}>
            <div style={{ fontSize: "5rem", marginBottom: "var(--spacing-4)" }}>✅</div>
            <h1 style={{ color: "var(--success)", marginBottom: "var(--spacing-2)" }}>Order Placed Successfully!</h1>
            <p style={{ fontSize: "1.1rem", marginBottom: "var(--spacing-8)", color: "var(--gray-600)" }}>
              Thank you for your order. Your items will be delivered soon. Redirecting to home...
            </p>
            <Link href="/">
              <button className="btn-primary">Back to Home</button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!mounted) {
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
            <h3 className="empty-state-title">Loading Cart...</h3>
          </div>
        </div>
      </main>
    );
  }

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
        </div>
      </header>

      {/* Authentication Modal */}
      {showAuthModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div className="card" style={{ maxWidth: "500px", width: "90%" }}>
            <button
              onClick={() => setShowAuthModal(false)}
              style={{
                position: "absolute",
                top: "var(--spacing-4)",
                right: "var(--spacing-4)",
                background: "none",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
                color: "var(--gray-600)",
              }}
            >
              ✕
            </button>

            <h2 style={{ marginBottom: "var(--spacing-2)", textAlign: "center" }}>
              {authMode === "login" ? "Sign In to Checkout" : "Create Account"}
            </h2>
            <p style={{ textAlign: "center", color: "var(--gray-600)", marginBottom: "var(--spacing-6)" }}>
              {authMode === "login"
                ? "Sign in to your account to continue checkout"
                : "Create a new account to complete your purchase"}
            </p>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: "var(--spacing-6)" }}>
                <span>⚠️</span>
                <div>{error}</div>
              </div>
            )}

            <form onSubmit={handleAuthSubmit}>
              <div style={{ marginBottom: "var(--spacing-4)" }}>
                <label htmlFor="auth-email">Email Address</label>
                <input
                  id="auth-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@example.com"
                  required
                />
              </div>

              {authMode === "signup" && (
                <>
                  <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-3)", marginBottom: "var(--spacing-4)" }}>
                    <div>
                      <label htmlFor="auth-firstName">First Name</label>
                      <input
                        id="auth-firstName"
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="auth-lastName">Last Name</label>
                      <input
                        id="auth-lastName"
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <div style={{ marginBottom: "var(--spacing-6)" }}>
                <label htmlFor="auth-password">Password</label>
                <input
                  id="auth-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={authMode === "login" ? "••••••••" : "Create a password"}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{
                  width: "100%",
                  padding: "var(--spacing-3)",
                  marginBottom: "var(--spacing-4)",
                }}
              >
                {loading ? "Processing..." : authMode === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>

            <div style={{ textAlign: "center" }}>
              <p style={{ color: "var(--gray-600)", marginBottom: "var(--spacing-2)" }}>
                {authMode === "login" ? "Don't have an account?" : "Already have an account?"}
              </p>
              <button
                onClick={() => {
                  setAuthMode(authMode === "login" ? "signup" : "login");
                  setError(null);
                  setFormData({ ...formData, password: "" });
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--primary)",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "1rem",
                }}
              >
                {authMode === "login" ? "Sign Up Instead" : "Sign In Instead"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container py-12">
        <h1 style={{ marginBottom: "var(--spacing-2)" }}>Shopping Cart & Checkout</h1>
        <p style={{ color: "var(--gray-600)", marginBottom: "var(--spacing-12)", fontSize: "1.1rem" }}>
          Review your items and complete your order
        </p>

        {user && (
          <div className="alert" style={{ marginBottom: "var(--spacing-8)", background: "linear-gradient(135deg, var(--success) 0%, #10b981 100%)", border: "none", color: "white" }}>
            <span>✅</span>
            <div>Signed in as <strong>{user.firstName} {user.lastName}</strong> ({user.email})</div>
          </div>
        )}

        <div className="grid" style={{ gridTemplateColumns: "1fr 400px", gap: "var(--spacing-8)" }}>
          {/* Cart Items */}
          <div className="card">
            {cartItems.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🛒</div>
                <h3 className="empty-state-title">Your Cart is Empty</h3>
                <p className="empty-state-text">Add items from the store to get started</p>
                <Link href={`/store/${slug}`}>
                  <button className="btn-primary">Continue Shopping</button>
                </Link>
              </div>
            ) : (
              <div>
                <h3 style={{ marginBottom: "var(--spacing-6)" }}>Cart Items</h3>
                {cartItems.map((item) => (
                  <div key={item.id} className="cart-item">
                    <div className="cart-item-info">
                      <h4 style={{ marginBottom: "var(--spacing-1)" }}>{item.name}</h4>
                      <p style={{ color: "var(--gray-600)", fontSize: "0.9rem" }}>
                        Unit Price: ${item.price.toFixed(2)}
                      </p>
                      <div style={{ marginTop: "var(--spacing-3)", display: "flex", alignItems: "center", gap: "var(--spacing-2)" }}>
                        <button
                          type="button"
                          onClick={() => decreaseQuantity(item.id)}
                          style={{
                            width: "32px",
                            height: "32px",
                            padding: 0,
                            background: "var(--gray-200)",
                            border: "1px solid var(--gray-300)",
                            borderRadius: "var(--radius-base)",
                            cursor: "pointer",
                            fontSize: "1rem",
                            fontWeight: "bold",
                            color: "var(--gray-700)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all var(--transition-fast)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "var(--gray-300)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "var(--gray-200)";
                          }}
                        >
                          −
                        </button>
                        <div
                          style={{
                            minWidth: "40px",
                            textAlign: "center",
                            fontWeight: "bold",
                            fontSize: "1.1rem",
                          }}
                        >
                          {item.quantity}
                        </div>
                        <button
                          type="button"
                          onClick={() => increaseQuantity(item.id)}
                          style={{
                            width: "32px",
                            height: "32px",
                            padding: 0,
                            background: "var(--primary)",
                            border: "1px solid var(--primary-dark)",
                            borderRadius: "var(--radius-base)",
                            cursor: "pointer",
                            fontSize: "1rem",
                            fontWeight: "bold",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all var(--transition-fast)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "var(--primary-dark)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "var(--primary)";
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "var(--spacing-3)" }}>
                      <div className="cart-item-price">${(item.price * item.quantity).toFixed(2)}</div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        style={{
                          background: "var(--danger)",
                          color: "white",
                          border: "none",
                          padding: "var(--spacing-2) var(--spacing-3)",
                          borderRadius: "var(--radius-base)",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                          transition: "all var(--transition-fast)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = "0.8";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = "1";
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="order-summary">
            <h3 style={{ marginBottom: "var(--spacing-6)", color: "var(--gray-900)" }}>Order Summary</h3>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: "var(--spacing-4)" }}>
                <span>⚠️</span>
                <div>{error}</div>
              </div>
            )}

            <form onSubmit={handleCheckout}>
              <div style={{ marginBottom: "var(--spacing-6)" }}>
                <h4 style={{ marginBottom: "var(--spacing-4)", color: "var(--gray-900)" }}>Delivery Details</h4>

                <div style={{ marginBottom: "var(--spacing-4)" }}>
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-3)", marginBottom: "var(--spacing-4)" }}>
                  <div>
                    <label htmlFor="firstName">First Name</label>
                    <input
                      id="firstName"
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName">Last Name</label>
                    <input
                      id="lastName"
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="address">Delivery Address</label>
                  <textarea
                    id="address"
                    name="deliveryAddress"
                    value={formData.deliveryAddress}
                    onChange={handleInputChange}
                    required
                  ></textarea>
                </div>
              </div>

              <div style={{ paddingTop: "var(--spacing-6)", borderTop: "2px solid var(--gray-200)" }}>
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Tax (8%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Shipping</span>
                  <span>${shipping.toFixed(2)}</span>
                </div>
                <div className="summary-row total">
                  <span>Total</span>
                  <span className="amount">${grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || cartItems.length === 0}
                className="btn-primary"
                style={{
                  width: "100%",
                  padding: "var(--spacing-4)",
                  marginTop: "var(--spacing-6)",
                  fontSize: "1.05rem",
                  opacity: loading || cartItems.length === 0 ? 0.6 : 1,
                  cursor: loading || cartItems.length === 0 ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Processing..." : !user ? "Sign In to Checkout" : "Complete Order"}
              </button>

              {!user && (
                <p style={{ marginTop: "var(--spacing-3)", fontSize: "0.85rem", color: "var(--gray-600)", textAlign: "center" }}>
                  You need to sign in or create an account to checkout
                </p>
              )}
            </form>

            <Link href={`/store/${slug}`}>
              <button
                className="btn-secondary"
                style={{
                  width: "100%",
                  padding: "var(--spacing-3)",
                  marginTop: "var(--spacing-4)",
                }}
              >
                Continue Shopping
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ marginTop: "var(--spacing-16)" }}>
        <div className="container">
          <div style={{ textAlign: "center", color: "var(--gray-400)" }}>
            <p>&copy; 2026 Grocio. All rights reserved. | Secure Checkout Powered by Grocio</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
