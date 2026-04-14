"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Product {
  id: string;
  name: string;
  description: string;
  price: string | number;
  sku: string;
  category: {
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

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category?.name === selectedCategory)
    : products;

  const addToCart = (productId: string) => {
    setCart((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1,
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const updated = { ...prev };
      if (updated[productId] > 1) {
        updated[productId]--;
      } else {
        delete updated[productId];
      }
      return updated;
    });
  };

  const cartItemCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = filteredProducts
    .filter((p) => cart[p.id])
    .reduce((sum, p) => sum + Number(p.price) * (cart[p.id] || 0), 0);

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
          <Link href="/">
            <h1 className="text-3xl font-bold text-green-600 hover:text-green-700 cursor-pointer">
              🛒 Grocio
            </h1>
          </Link>
          <Link href={`/cart?slug=${slug}`}>
            <button className="relative bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-semibold transition">
              🛒 Cart
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                  {cartItemCount}
                </span>
              )}
            </button>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-2">
            {slug.replace(/-/g, " ").toUpperCase()}
          </h2>
          <p className="text-gray-600">Shop fresh & quality products</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded mb-8">
            Error: {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading products...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar - Categories */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Categories</h3>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`block w-full text-left px-4 py-2 rounded mb-2 font-semibold transition ${
                    selectedCategory === null
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                  }`}
                >
                  All Products
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`block w-full text-left px-4 py-2 rounded mb-2 font-semibold transition ${
                      selectedCategory === cat.name
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Main - Products */}
            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <p className="text-gray-600 text-lg">No products found</p>
                  </div>
                ) : (
                  filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
                    >
                      <div className="bg-gradient-to-br from-green-100 to-blue-100 h-40 flex items-center justify-center">
                        <span className="text-5xl">🥬</span>
                      </div>
                      <div className="p-4">
                        <p className="text-sm text-green-600 font-semibold mb-1">
                          {product.category?.name || "General"}
                        </p>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                          {product.name}
                        </h3>
                        <p className="text-gray-600 text-sm mb-4">
                          {product.description || "Quality product"}
                        </p>
                        <div className="flex justify-between items-center">
                          <span className="text-2xl font-bold text-green-600">
                            ${Number(product.price).toFixed(2)}
                          </span>
                          <div className="flex gap-2">
                            {cart[product.id] ? (
                              <>
                                <button
                                  onClick={() => removeFromCart(product.id)}
                                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
                                >
                                  −
                                </button>
                                <span className="w-8 text-center font-semibold">
                                  {cart[product.id]}
                                </span>
                                <button
                                  onClick={() => addToCart(product.id)}
                                  className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition"
                                >
                                  +
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => addToCart(product.id)}
                                className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 font-semibold transition"
                              >
                                Add
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Cart Summary */}
              {cartItemCount > 0 && (
                <div className="mt-12 bg-white rounded-lg shadow-lg p-8">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-gray-600">Total Items: {cartItemCount}</p>
                      <p className="text-3xl font-bold text-green-600">
                        ${cartTotal ? cartTotal.toFixed(2) : "0.00"}
                      </p>
                    </div>
                    <Link href={`/cart?slug=${slug}`}>
                      <button className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-semibold transition text-lg">
                        Proceed to Checkout →
                      </button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
