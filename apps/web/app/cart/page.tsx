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

export default function CartPage() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug") || "demo-grocery";

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [formData, setFormData] = useState({
    email: "customer@example.local",
    firstName: "John",
    lastName: "Doe",
    deliveryAddress: "123 Main Street, City, State 12345",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:3001/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "temp-user-id",
          tenantId: "demo-tenant-id",
          cartId: "temp-cart-id",
          deliveryAddress: formData.deliveryAddress,
          items: cartItems,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create order");
      }

      setSuccess(true);
      setCartItems([]);
      setTimeout(() => {
        window.location.href = "/";
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
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

      <div className="container py-12">
        <h1 style={{ marginBottom: "var(--spacing-2)" }}>Shopping Cart & Checkout</h1>
        <p style={{ color: "var(--gray-600)", marginBottom: "var(--spacing-12)", fontSize: "1.1rem" }}>
          Review your items and complete your order
        </p>

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
                        Quantity: <strong>{item.quantity}</strong>
                      </p>
                      <p style={{ color: "var(--gray-600)", fontSize: "0.9rem" }}>
                        Unit Price: ${item.price.toFixed(2)}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="cart-item-price">${(item.price * item.quantity).toFixed(2)}</div>
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
                {loading ? "Processing..." : "Complete Order"}
              </button>
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
