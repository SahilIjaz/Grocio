import "./globals.css";

export const metadata = {
  title: "Grocio - Online Grocery Shopping",
  description: "Multi-tenant grocery management system"
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
