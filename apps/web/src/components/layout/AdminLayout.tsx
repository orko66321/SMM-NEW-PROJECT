import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.js";

const navItems = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/services", label: "Services" },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/deposits", label: "Deposits" },
  { to: "/admin/tickets", label: "Tickets" },
  { to: "/admin/providers", label: "Providers" },
  { to: "/admin/payment-gateways", label: "Payment Gateways" },
  { to: "/admin/payment-methods", label: "Payment Methods" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-outline-variant bg-surface-container-high md:block">
        <div className="flex h-16 items-center gap-2 px-6 font-display text-lg font-bold text-on-surface">
          <span className="badge bg-primary/20 text-primary">Admin</span> Panel
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-md px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-outline-variant bg-surface-container-high px-6">
          <div className="font-mono text-sm text-on-surface-variant">
            admin: @{user?.username}
          </div>
          <div className="flex items-center gap-3">
            <NavLink to="/dashboard" className="btn-ghost !px-3 !py-1.5 text-xs">
              User panel
            </NavLink>
            <button
              className="btn-ghost !px-3 !py-1.5 text-xs"
              onClick={async () => {
                await logout();
                navigate("/login");
              }}
            >
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
