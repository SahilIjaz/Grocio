"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  address?: string;
  logoUrl?: string | null;
}

export default function Home() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiUrl = "https://ec2-13-53-205-180.eu-north-1.compute.amazonaws.com:3001";
    console.log("🔄 Fetching stores from:", `${apiUrl}/api/v1/tenants`);

    fetch(`${apiUrl}/api/v1/tenants`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        console.log("Response received:", res.status);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("Stores loaded:", data);
        setTenants(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching stores:", err);
        setError(err instanceof Error ? err.message : "Failed to load stores");
        setLoading(false);
      });
  }, []);

  return (
    <main className="min-h-screen" style={{ background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)" }}>
      {/* Header */}
      <header>
        <div className="container">
          <div className="logo">
            <span>🛒</span>
            <span>Grocio</span>
          </div>
          <div className="nav" style={{ gap: "var(--spacing-6)" }}>
            <a href="#stores" style={{ color: "var(--gray-600)", fontWeight: 600 }}>Stores</a>
            <a href="#features" style={{ color: "var(--gray-600)", fontWeight: 600 }}>Features</a>
            <a href="#accounts" style={{ color: "var(--gray-600)", fontWeight: 600 }}>Demo</a>
            <Link href="/auth/login">
              <button className="btn-secondary">Login</button>
            </Link>
            <Link href="/auth/signup">
              <button className="btn-primary">Sign Up</button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        style={{
          padding: "var(--spacing-16) var(--spacing-8)",
          textAlign: "center",
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)",
        }}
      >
        <div className="container">
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            <h1 style={{ fontSize: "3.5rem", marginBottom: "var(--spacing-4)", lineHeight: 1.2 }}>
              Fresh Groceries Delivered to Your Door
            </h1>
            <p
              style={{
                fontSize: "1.25rem",
                color: "var(--gray-600)",
                marginBottom: "var(--spacing-8)",
                lineHeight: 1.6,
              }}
            >
              Experience the convenience of online grocery shopping with our premium selection of fresh products,
              competitive prices, and fast delivery.
            </p>
            <div style={{ display: "flex", gap: "var(--spacing-4)", justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="#stores">
                <button className="btn-primary" style={{ padding: "var(--spacing-4) var(--spacing-8)", fontSize: "1.1rem" }}>
                  Explore Stores →
                </button>
              </Link>
              <button
                className="btn-ghost"
                style={{ padding: "var(--spacing-4) var(--spacing-8)", fontSize: "1.1rem" }}
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              >
                Learn More
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{ padding: "var(--spacing-16) var(--spacing-8)" }}>
        <div className="container">
          <h2 style={{ textAlign: "center", marginBottom: "var(--spacing-12)" }}>Why Choose Grocio?</h2>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
            {[
              {
                icon: "🚚",
                title: "Fast Delivery",
                description: "Get your groceries delivered in 24 hours or less",
              },
              {
                icon: "🌿",
                title: "Fresh Products",
                description: "Sourced from the best local and organic suppliers",
              },
              {
                icon: "💰",
                title: "Great Prices",
                description: "Competitive pricing with regular discounts and offers",
              },
              {
                icon: "🛡️",
                title: "Secure Checkout",
                description: "Safe and secure payment processing with SSL encryption",
              },
              {
                icon: "📱",
                title: "Easy Shopping",
                description: "Intuitive interface for seamless online shopping experience",
              },
              {
                icon: "🌍",
                title: "Wide Selection",
                description: "Browse from thousands of products across multiple categories",
              },
            ].map((feature, idx) => (
              <div key={idx} className="card">
                <div style={{ fontSize: "3rem", marginBottom: "var(--spacing-4)" }}>{feature.icon}</div>
                <h4 style={{ marginBottom: "var(--spacing-2)" }}>{feature.title}</h4>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stores Section */}
      <section id="stores" style={{ padding: "var(--spacing-16) var(--spacing-8)", background: "var(--gray-50)" }}>
        <div className="container">
          <h2 style={{ textAlign: "center", marginBottom: "var(--spacing-12)" }}>Available Stores</h2>

          {error && (
            <div className="alert alert-error" style={{ maxWidth: "600px", margin: "0 auto var(--spacing-8)" }}>
              <span>⚠️</span>
              <div>Error: {error}</div>
            </div>
          )}

          {loading ? (
            <div className="empty-state">
              <div className="empty-state-icon">⏳</div>
              <h3 className="empty-state-title">Loading Stores</h3>
              <p className="empty-state-text">Fetching available stores...</p>
            </div>
          ) : tenants.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏪</div>
              <h3 className="empty-state-title">No Stores Available</h3>
              <p className="empty-state-text">Check back soon for more stores!</p>
            </div>
          ) : (
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))" }}>
              {tenants.map((tenant) => (
                <div key={tenant.id} className="card" style={{ overflow: "hidden" }}>
                  <div
                    style={{
                      width: "100%",
                      height: "200px",
                      background: tenant.logoUrl ? "none" : "linear-gradient(135deg, var(--primary-light) 0%, #e0f2fe 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "4rem",
                      marginBottom: "var(--spacing-6)",
                      overflow: "hidden",
                    }}
                  >
                    {tenant.logoUrl ? (
                      <img
                        src={tenant.logoUrl}
                        alt={tenant.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <span>🛍️</span>
                    )}
                  </div>
                  <h3 style={{ marginBottom: "var(--spacing-2)" }}>{tenant.name}</h3>
                  <p style={{ marginBottom: "var(--spacing-4)", color: "var(--gray-600)" }}>
                    {tenant.address || "Premium grocery selection"}
                  </p>
                  <div style={{ display: "flex", gap: "var(--spacing-2)", alignItems: "center", marginBottom: "var(--spacing-6)" }}>
                    <span
                      style={{
                        display: "inline-block",
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "var(--success)",
                      }}
                    ></span>
                    <span style={{ fontSize: "0.9rem", color: "var(--gray-600)" }}>Open Now</span>
                  </div>
                  <Link href={`/store/${tenant.slug}`}>
                    <button className="btn-primary" style={{ width: "100%", padding: "var(--spacing-3)" }}>
                      Shop Now →
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Demo Accounts Section */}
      <section id="accounts" style={{ padding: "var(--spacing-16) var(--spacing-8)" }}>
        <div className="container" style={{ maxWidth: "900px" }}>
          <h2 style={{ textAlign: "center", marginBottom: "var(--spacing-12)" }}>Demo Accounts for Testing</h2>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            {[
              {
                title: "Admin Account",
                icon: "👨‍💼",
                email: "admin@grocio.local",
                password: "SuperAdmin123!",
                color: "var(--secondary)",
              },
              {
                title: "Store Owner",
                icon: "🏪",
                email: "owner@democore.local",
                password: "StoreAdmin123!",
                color: "var(--primary)",
              },
              {
                title: "Customer Account",
                icon: "👤",
                email: "customer@example.local",
                password: "Customer123!",
                color: "var(--accent)",
              },
            ].map((account, idx) => (
              <div
                key={idx}
                className="card"
                style={{
                  borderLeft: `4px solid ${account.color}`,
                  position: "relative",
                }}
              >
                <div style={{ fontSize: "3rem", marginBottom: "var(--spacing-4)" }}>{account.icon}</div>
                <h4 style={{ marginBottom: "var(--spacing-4)", color: "var(--gray-900)" }}>{account.title}</h4>
                <div style={{ background: "var(--gray-50)", padding: "var(--spacing-4)", borderRadius: "var(--radius-base)", marginBottom: "var(--spacing-3)" }}>
                  <p style={{ fontSize: "0.85rem", color: "var(--gray-600)", marginBottom: "var(--spacing-1)" }}>
                    <strong>Email:</strong>
                  </p>
                  <p
                    style={{
                      fontSize: "0.9rem",
                      color: account.color,
                      fontFamily: "monospace",
                      fontWeight: 600,
                      wordBreak: "break-all",
                    }}
                  >
                    {account.email}
                  </p>
                </div>
                <div style={{ background: "var(--gray-50)", padding: "var(--spacing-4)", borderRadius: "var(--radius-base)" }}>
                  <p style={{ fontSize: "0.85rem", color: "var(--gray-600)", marginBottom: "var(--spacing-1)" }}>
                    <strong>Password:</strong>
                  </p>
                  <p
                    style={{
                      fontSize: "0.9rem",
                      color: account.color,
                      fontFamily: "monospace",
                      fontWeight: 600,
                      wordBreak: "break-all",
                    }}
                  >
                    {account.password}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        style={{
          padding: "var(--spacing-16) var(--spacing-8)",
          background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
          color: "white",
          textAlign: "center",
        }}
      >
        <div className="container" style={{ maxWidth: "600px" }}>
          <h2 style={{ color: "white", marginBottom: "var(--spacing-4)" }}>Ready to Start Shopping?</h2>
          <p style={{ fontSize: "1.1rem", marginBottom: "var(--spacing-8)", opacity: 0.95 }}>
            Explore our stores and discover premium quality products delivered to your door
          </p>
          <Link href="#stores">
            <button
              className="btn-primary"
              style={{
                padding: "var(--spacing-4) var(--spacing-8)",
                fontSize: "1.1rem",
                background: "white",
                color: "var(--primary)",
              }}
            >
              Browse Stores Now →
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="container">
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
            <div>
              <h4 style={{ color: "white", marginBottom: "var(--spacing-4)" }}>About Grocio</h4>
              <p>Your trusted online grocery store delivering fresh products and exceptional service.</p>
            </div>
            <div>
              <h4 style={{ color: "white", marginBottom: "var(--spacing-4)" }}>Quick Links</h4>
              <ul style={{ listStyle: "none" }}>
                <li style={{ marginBottom: "var(--spacing-2)" }}>
                  <a href="#stores">Stores</a>
                </li>
                <li style={{ marginBottom: "var(--spacing-2)" }}>
                  <a href="#features">Features</a>
                </li>
                <li style={{ marginBottom: "var(--spacing-2)" }}>
                  <a href="#accounts">Demo Accounts</a>
                </li>
              </ul>
            </div>
            <div>
              <h4 style={{ color: "white", marginBottom: "var(--spacing-4)" }}>Support</h4>
              <ul style={{ listStyle: "none" }}>
                <li style={{ marginBottom: "var(--spacing-2)" }}>
                  <a href="#">Help Center</a>
                </li>
                <li style={{ marginBottom: "var(--spacing-2)" }}>
                  <a href="#">Contact Support</a>
                </li>
                <li style={{ marginBottom: "var(--spacing-2)" }}>
                  <a href="#">Shipping & Returns</a>
                </li>
              </ul>
            </div>
          </div>
          <div style={{ marginTop: "var(--spacing-8)", paddingTop: "var(--spacing-8)", borderTop: "1px solid rgba(255,255,255,0.1)", textAlign: "center", color: "var(--gray-400)" }}>
            <p>&copy; 2026 Grocio. All rights reserved. | Advanced E-Commerce Platform</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
