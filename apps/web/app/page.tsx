"use client";
export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">Welcome to Grocio</h1>
        <p className="text-xl text-gray-600 mb-8">Multi-Tenant Grocery Management System</p>
        
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Demo Accounts</h2>
          <div className="space-y-4 text-left">
            <div className="p-4 bg-blue-50 rounded">
              <p className="font-bold text-blue-900">Admin</p>
              <p className="text-blue-700">admin@grocio.local / SuperAdmin123!</p>
            </div>
            <div className="p-4 bg-green-50 rounded">
              <p className="font-bold text-green-900">Store Owner</p>
              <p className="text-green-700">owner@democore.local / StoreAdmin123!</p>
            </div>
            <div className="p-4 bg-purple-50 rounded">
              <p className="font-bold text-purple-900">Customer</p>
              <p className="text-purple-700">customer@example.local / Customer123!</p>
            </div>
          </div>
        </div>

        <div className="bg-green-100 border-l-4 border-green-500 p-4 mb-8">
          <p className="text-green-700">✅ API Running on http://localhost:3001</p>
          <p className="text-green-700">✅ Database Connected</p>
          <p className="text-green-700">✅ Frontend Ready</p>
        </div>

        <button className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-semibold">
          Start Shopping
        </button>
      </div>
    </main>
  );
}
