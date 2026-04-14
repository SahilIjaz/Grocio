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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // In a real app, you'd create a cart in the backend first
      // For now, we'll just create an order directly
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
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-lg shadow-lg p-12 text-center max-w-md">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold text-green-600 mb-2">Order Placed!</h1>
          <p className="text-gray-600 mb-4">
            Thank you for your order. You'll be redirected to home in a moment...
          </p>
          <Link href="/">
            <button className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-semibold transition">
              Back to Home
            </button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <Link href="/">
            <h1 className="text-3xl font-bold text-green-600 hover:text-green-700 cursor-pointer">
              🛒 Grocio
            </h1>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-12">
        <h2 className="text-4xl font-bold text-gray-900 mb-8">Shopping Cart & Checkout</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-8">
              {cartItems.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 text-lg mb-4">Your cart is empty</p>
                  <p className="text-gray-500 mb-6">
                    Demo mode: Add items from the store page to see them here
                  </p>
                  <Link href={`/store/${slug}`}>
                    <button className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-semibold transition">
                      Continue Shopping
                    </button>
                  </Link>
                </div>
              ) : (
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Items</h3>
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center py-4 border-b last:border-b-0"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">{item.name}</p>
                        <p className="text-gray-600">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-bold text-green-600">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Checkout Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-8 sticky top-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h3>

              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleCheckout}>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-1">
                      Delivery Address
                    </label>
                    <textarea
                      name="deliveryAddress"
                      value={formData.deliveryAddress}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                      required
                    ></textarea>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <div className="flex justify-between mb-4">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-semibold text-gray-900">${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-6">
                    <span className="text-gray-600">Delivery:</span>
                    <span className="font-semibold text-gray-900">$0.00</span>
                  </div>
                  <div className="flex justify-between mb-6 text-lg">
                    <span className="font-bold text-gray-900">Total:</span>
                    <span className="font-bold text-green-600">${total.toFixed(2)}</span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || cartItems.length === 0}
                    className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold transition"
                  >
                    {loading ? "Processing..." : "Complete Order"}
                  </button>
                </div>
              </form>

              <Link href={`/store/${slug}`}>
                <button className="w-full mt-4 bg-gray-200 text-gray-900 px-6 py-2 rounded-lg hover:bg-gray-300 font-semibold transition">
                  Continue Shopping
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
