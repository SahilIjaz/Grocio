import { Suspense } from "react";
import CartClient from "./cart-client";

function LoadingCart() {
  return (
    <main className="min-h-screen" style={{ background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)" }}>
      <header>
        <div className="container">
          <div className="logo">
            <span>🛒</span>
            <span>Grocio</span>
          </div>
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

export default function CartPage() {
  return (
    <Suspense fallback={<LoadingCart />}>
      <CartClient />
    </Suspense>
  );
}
