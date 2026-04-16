"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Invalid email or password");
      }

      const user = await response.json();

      // Store auth data in localStorage
      localStorage.setItem("user", JSON.stringify(user));

      // Redirect based on role
      if (user.role === "super_admin") {
        router.push("/admin");
      } else if (user.role === "store_admin") {
        router.push("/dashboard");
      } else {
        router.push("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (email: string, password: string) => {
    setFormData({ email, password });
  };

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

      <div className="container py-12" style={{ maxWidth: "500px" }}>
        <div className="card">
          <h1 style={{ textAlign: "center", marginBottom: "var(--spacing-2)" }}>Welcome Back</h1>
          <p style={{ textAlign: "center", color: "var(--gray-600)", marginBottom: "var(--spacing-8)" }}>
            Sign in to your Grocio account
          </p>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: "var(--spacing-6)" }}>
              <span>⚠️</span>
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "var(--spacing-4)" }}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="you@example.com"
                required
              />
            </div>

            <div style={{ marginBottom: "var(--spacing-8)" }}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", padding: "var(--spacing-3)" }}>
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <div style={{ marginTop: "var(--spacing-8)", paddingTop: "var(--spacing-8)", borderTop: "1px solid var(--gray-200)" }}>
            <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--gray-700)", marginBottom: "var(--spacing-4)" }}>
              Demo Accounts:
            </p>
            {[
              { label: "Admin", email: "admin@grocio.local", password: "SuperAdmin123!", color: "var(--secondary)" },
              { label: "Store Owner", email: "owner@democore.local", password: "StoreAdmin123!", color: "var(--primary)" },
              { label: "Customer", email: "customer@example.local", password: "Customer123!", color: "var(--accent)" },
            ].map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillDemoAccount(account.email, account.password)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "var(--spacing-3) var(--spacing-4)",
                  marginBottom: "var(--spacing-2)",
                  textAlign: "left",
                  borderRadius: "var(--radius-base)",
                  border: `2px solid ${account.color}`,
                  background: "white",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                  color: "var(--gray-700)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = account.color;
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "white";
                  e.currentTarget.style.color = "var(--gray-700)";
                }}
              >
                <strong>{account.label}</strong>
                <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>{account.email}</div>
              </button>
            ))}
          </div>

          <p style={{ textAlign: "center", marginTop: "var(--spacing-6)", color: "var(--gray-600)" }}>
            Don't have an account?{" "}
            <Link href="/auth/signup" style={{ color: "var(--primary)", fontWeight: 600 }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
