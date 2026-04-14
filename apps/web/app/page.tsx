"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
}

export default function Home() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("http://localhost:3001/api/v1/tenants")
      .then((res) => res.json())
      .then((data) => {
        setTenants(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-2">🛒 Grocio</h1>
          <p className="text-xl text-gray-600">Multi-Tenant Grocery Shopping</p>
        </div>

        {error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded mb-8">
            Error: {error}
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading stores...</p>
          </div>
        ) : tenants.length === 0 ? (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-6 py-4 rounded mb-8">
            No stores available
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {tenants.map((tenant) => (
                <Link href={`/store/${tenant.slug}`} key={tenant.id}>
                  <div className="bg-white rounded-lg shadow-lg hover:shadow-xl transition cursor-pointer overflow-hidden">
                    <div className="bg-gradient-to-r from-green-400 to-blue-500 h-32"></div>
                    <div className="p-6">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {tenant.name}
                      </h2>
                      <p className="text-gray-600 mb-4">
                        Shop fresh groceries & more
                      </p>
                      <button className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-semibold transition">
                        Enter Store →
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="bg-white rounded-lg shadow-lg p-8 mt-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Demo Accounts for Testing
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-blue-50 rounded border border-blue-200">
                  <p className="font-bold text-blue-900 mb-2">Admin Account</p>
                  <p className="text-sm text-blue-700 mb-1">Email: admin@grocio.local</p>
                  <p className="text-sm text-blue-700">Password: SuperAdmin123!</p>
                </div>
                <div className="p-4 bg-green-50 rounded border border-green-200">
                  <p className="font-bold text-green-900 mb-2">Store Owner</p>
                  <p className="text-sm text-green-700 mb-1">Email: owner@democore.local</p>
                  <p className="text-sm text-green-700">Password: StoreAdmin123!</p>
                </div>
                <div className="p-4 bg-purple-50 rounded border border-purple-200">
                  <p className="font-bold text-purple-900 mb-2">Customer Account</p>
                  <p className="text-sm text-purple-700 mb-1">Email: customer@example.local</p>
                  <p className="text-sm text-purple-700">Password: Customer123!</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
