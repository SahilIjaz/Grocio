"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<"customer" | "store-owner" | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    storeName: "",
    storeSlug: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      setError("Please fill in all required fields");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (accountType === "store-owner" && (!formData.storeName || !formData.storeSlug)) {
      setError("Please provide store name and slug");
      setLoading(false);
      return;
    }

    try {
      // Register user
      const registerRes = await fetch("http://localhost:3001/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: accountType === "store-owner" ? "store_admin" : "customer",
          storeName: accountType === "store-owner" ? formData.storeName : undefined,
          storeSlug: accountType === "store-owner" ? formData.storeSlug : undefined,
        }),
      });

      if (!registerRes.ok) {
        throw new Error("Registration failed");
      }

      const userData = await registerRes.json();

      // If store owner, store the user data and redirect to dashboard
      if (accountType === "store-owner") {
        localStorage.setItem("user", JSON.stringify(userData));
        setSuccess(true);
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      } else {
        // For customers, redirect to login
        setSuccess(true);
        setTimeout(() => {
          router.push("/auth/login");
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)" }}>
        <div className="card" style={{ maxWidth: "500px", textAlign: "center" }}>
          <div style={{ fontSize: "5rem", marginBottom: "var(--spacing-4)" }}>✅</div>
          <h1 style={{ color: "var(--success)", marginBottom: "var(--spacing-2)" }}>Account Created!</h1>
          <p style={{ marginBottom: "var(--spacing-8)", color: "var(--gray-600)" }}>
            Your account has been created successfully. Redirecting to login...
          </p>
        </div>
      </main>
    );
  }

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

      <div className="container py-12" style={{ maxWidth: "600px" }}>
        <div className="card">
          <h1 style={{ textAlign: "center", marginBottom: "var(--spacing-2)" }}>Create Account</h1>
          <p style={{ textAlign: "center", color: "var(--gray-600)", marginBottom: "var(--spacing-8)" }}>
            Join Grocio as a customer or store owner
          </p>

          {!accountType ? (
            <div>
              <p style={{ marginBottom: "var(--spacing-4)", fontWeight: 600, color: "var(--gray-700)" }}>
                What are you signing up as?
              </p>
              <div className="grid" style={{ gridTemplateColumns: "1fr", gap: "var(--spacing-4)", marginBottom: "var(--spacing-8)" }}>
                <button
                  onClick={() => setAccountType("customer")}
                  style={{
                    padding: "var(--spacing-6)",
                    border: "2px solid var(--gray-300)",
                    borderRadius: "var(--radius-lg)",
                    background: "white",
                    cursor: "pointer",
                    transition: "all var(--transition-base)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--primary)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--gray-300)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{ fontSize: "2.5rem", marginBottom: "var(--spacing-2)" }}>👤</div>
                  <h3 style={{ marginBottom: "var(--spacing-1)", fontSize: "1.1rem" }}>Customer</h3>
                  <p style={{ fontSize: "0.9rem", color: "var(--gray-600)" }}>Browse & buy groceries</p>
                </button>

                <button
                  onClick={() => setAccountType("store-owner")}
                  style={{
                    padding: "var(--spacing-6)",
                    border: "2px solid var(--gray-300)",
                    borderRadius: "var(--radius-lg)",
                    background: "white",
                    cursor: "pointer",
                    transition: "all var(--transition-base)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--primary)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--gray-300)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{ fontSize: "2.5rem", marginBottom: "var(--spacing-2)" }}>🏪</div>
                  <h3 style={{ marginBottom: "var(--spacing-1)", fontSize: "1.1rem" }}>Store Owner</h3>
                  <p style={{ fontSize: "0.9rem", color: "var(--gray-600)" }}>Manage your store</p>
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => setAccountType(null)}
                style={{
                  marginBottom: "var(--spacing-6)",
                  background: "var(--gray-100)",
                  padding: "var(--spacing-2) var(--spacing-4)",
                  borderRadius: "var(--radius-base)",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--gray-600)",
                  fontWeight: 600,
                }}
              >
                ← Back
              </button>

              {error && (
                <div className="alert alert-error" style={{ marginBottom: "var(--spacing-6)" }}>
                  <span>⚠️</span>
                  <div>{error}</div>
                </div>
              )}

              <form onSubmit={handleSignUp}>
                <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-4)", marginBottom: "var(--spacing-4)" }}>
                  <div>
                    <label htmlFor="firstName">First Name *</label>
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
                    <label htmlFor="lastName">Last Name *</label>
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

                <div style={{ marginBottom: "var(--spacing-4)" }}>
                  <label htmlFor="email">Email *</label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                {accountType === "store-owner" && (
                  <>
                    <div style={{ marginBottom: "var(--spacing-4)" }}>
                      <label htmlFor="storeName">Store Name *</label>
                      <input
                        id="storeName"
                        type="text"
                        name="storeName"
                        value={formData.storeName}
                        onChange={handleInputChange}
                        placeholder="e.g., Fresh Farm Market"
                        required
                      />
                    </div>

                    <div style={{ marginBottom: "var(--spacing-4)" }}>
                      <label htmlFor="storeSlug">Store URL Slug *</label>
                      <input
                        id="storeSlug"
                        type="text"
                        name="storeSlug"
                        value={formData.storeSlug}
                        onChange={handleInputChange}
                        placeholder="e.g., fresh-farm"
                        required
                      />
                    </div>
                  </>
                )}

                <div style={{ marginBottom: "var(--spacing-4)" }}>
                  <label htmlFor="password">Password *</label>
                  <input
                    id="password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div style={{ marginBottom: "var(--spacing-8)" }}>
                  <label htmlFor="confirmPassword">Confirm Password *</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", padding: "var(--spacing-3)" }}>
                  {loading ? "Creating Account..." : "Create Account"}
                </button>
              </form>

              <p style={{ textAlign: "center", marginTop: "var(--spacing-6)", color: "var(--gray-600)" }}>
                Already have an account?{" "}
                <Link href="/auth/login" style={{ color: "var(--primary)", fontWeight: 600 }}>
                  Log in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
