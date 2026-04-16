"use client";

export default function DebugPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const fallbackUrl = "http://localhost:3001";
  const finalUrl = apiUrl || fallbackUrl;

  return (
    <main style={{ padding: "40px", fontFamily: "monospace" }}>
      <h1>Debug: API Configuration</h1>

      <div style={{ marginBottom: "20px", padding: "20px", background: "#f0f0f0", borderRadius: "8px" }}>
        <h2>Environment Variables</h2>
        <p><strong>NEXT_PUBLIC_API_URL:</strong> {apiUrl ? <span style={{ color: "green" }}>{apiUrl}</span> : <span style={{ color: "red" }}>NOT SET</span>}</p>
        <p><strong>Fallback URL:</strong> {fallbackUrl}</p>
        <p><strong>Final URL Being Used:</strong> <span style={{ color: "blue", fontWeight: "bold" }}>{finalUrl}</span></p>
      </div>

      <div style={{ marginBottom: "20px", padding: "20px", background: "#f0f0f0", borderRadius: "8px" }}>
        <h2>Test API Connection</h2>
        <p>Testing connection to: <strong>{finalUrl}</strong></p>
        <button
          onClick={async () => {
            try {
              const res = await fetch(`${finalUrl}/api/v1/health`);
              const data = await res.json();
              alert(`✅ Success!\nStatus: ${res.status}\nResponse: ${JSON.stringify(data)}`);
            } catch (err) {
              alert(`❌ Failed!\nError: ${err instanceof Error ? err.message : String(err)}`);
            }
          }}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            cursor: "pointer",
            background: "#10b981",
            color: "white",
            border: "none",
            borderRadius: "4px"
          }}
        >
          Test Health Check
        </button>
      </div>

      <div style={{ marginBottom: "20px", padding: "20px", background: "#f0f0f0", borderRadius: "8px" }}>
        <h2>What to Check</h2>
        <ul>
          <li>If NEXT_PUBLIC_API_URL shows "NOT SET", add it to Vercel environment variables</li>
          <li>If it shows a URL, click "Test Health Check" to verify connection</li>
          <li>If test fails, check EC2 security group allows port 3001</li>
        </ul>
      </div>
    </main>
  );
}
