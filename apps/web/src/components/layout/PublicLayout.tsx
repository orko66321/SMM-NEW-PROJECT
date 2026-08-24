import { Outlet, NavLink, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.js";
import CurrencySwitcher from "./CurrencySwitcher.js";
import NoticeBar from "./NoticeBar.js";

const navItems = [
  { to: "/", label: "Home", end: true },
  { to: "/services", label: "Services" },
  { to: "/api-docs", label: "API" },
];

export default function PublicLayout() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-outline-variant/60 bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-container items-center justify-between px-4 sm:px-6">
          <Link to="/" className="font-display text-lg font-bold text-on-surface">
            <span className="badge bg-primary/20 text-primary">SMM</span> Elite
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium transition ${
                    isActive ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <CurrencySwitcher />
            {user ? (
              <Link to={user.role === "ADMIN" ? "/admin" : "/dashboard"} className="btn-primary !px-4 !py-1.5 text-sm">
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-ghost !px-3 !py-1.5 text-sm">Sign In</Link>
                <Link to="/register" className="btn-primary !px-4 !py-1.5 text-sm">Sign Up</Link>
              </>
            )}
          </div>
        </div>
        <NoticeBar />
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-outline-variant/60 bg-surface-container/40">
        <div className="mx-auto max-w-container px-4 py-8 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-display font-bold text-on-surface">SMM Elite</p>
              <p className="text-xs text-on-surface-variant">© {new Date().getFullYear()} SMM Elite Panel. All rights reserved.</p>
            </div>
            <div className="flex gap-5 text-sm text-on-surface-variant">
              <Link to="/services" className="hover:text-on-surface">Services</Link>
              <Link to="/api-docs" className="hover:text-on-surface">API Docs</Link>
              <Link to="/login" className="hover:text-on-surface">Sign In</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
