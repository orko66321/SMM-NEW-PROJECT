import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.js";
import NoticeBar from "./NoticeBar.js";
import { Logo } from "../Logo.js";
import { Icon, type IconName } from "../ds/Icon.js";
import { cn } from "../ds/cn.js";

// `adminOnly` rows/sections are hidden from MODERATOR accounts — the server
// rejects them anyway (routes/admin/index.ts), this just keeps the nav
// honest. Kept in sync with the `adminOnly` sub-routers there.
type NavRow =
  | { section: string; adminOnly?: boolean }
  | { to: string; label: string; end?: boolean; icon: IconName; adminOnly?: boolean };

const navRows: NavRow[] = [
  { to: "/admin", label: "Dashboard", end: true, icon: "dashboard" },
  { to: "/admin/users", label: "Users", icon: "users" },
  { to: "/admin/orders", label: "Orders", icon: "orders" },
  { to: "/admin/deposits", label: "Deposits", icon: "wallet" },
  { to: "/admin/tickets", label: "Tickets", icon: "support" },
  { section: "Catalogue", adminOnly: true },
  { to: "/admin/services", label: "Services", icon: "grid", adminOnly: true },
  { to: "/admin/brands", label: "Store: Brands", icon: "tag", adminOnly: true },
  { to: "/admin/products", label: "Store: Products", icon: "package", adminOnly: true },
  { to: "/admin/packages", label: "Store: Packages", icon: "package", adminOnly: true },
  { to: "/admin/stock-pools", label: "Store: Stock Pools", icon: "package", adminOnly: true },
  { section: "Integrations", adminOnly: true },
  { to: "/admin/providers", label: "Providers", icon: "provider", adminOnly: true },
  { to: "/admin/payment-gateways", label: "Payment Gateways", icon: "card", adminOnly: true },
  { to: "/admin/payment-methods", label: "Payment Methods", icon: "card", adminOnly: true },
  { section: "Content", adminOnly: true },
  { to: "/admin/support-channels", label: "Support Channels", icon: "support", adminOnly: true },
  { to: "/admin/coupons", label: "Coupons", icon: "coupon", adminOnly: true },
  { to: "/admin/comments", label: "Comment", icon: "bell", adminOnly: true },
  { to: "/admin/notice-settings", label: "Notice Settings", icon: "campaign", adminOnly: true },
  { to: "/admin/banner", label: "Banner Slider", icon: "image", adminOnly: true },
  { to: "/admin/posts", label: "Documentation", icon: "docs", adminOnly: true },
  { section: "System", adminOnly: true },
  { to: "/admin/settings", label: "Settings", icon: "settings", adminOnly: true },
];

const bottomNavItems: { to: string; label: string; end?: boolean; icon: IconName }[] = [
  { to: "/admin", label: "Home", end: true, icon: "dashboard" },
  { to: "/admin/users", label: "Users", icon: "users" },
  { to: "/admin/orders", label: "Orders", icon: "orders" },
  { to: "/admin/deposits", label: "Deposits", icon: "wallet" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex min-h-[44px] items-center gap-3 rounded-control border-r-[3px] px-3 py-2 text-sm transition duration-200 ease-ds",
      isActive
        ? "border-accent-on-dark bg-primary/15 font-semibold text-accent-on-dark"
        : "border-transparent font-medium text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface",
    );

  const isModerator = user?.role === "MODERATOR";
  const visibleNavRows = isModerator ? navRows.filter((row) => !row.adminOnly) : navRows;

  function NavList() {
    return (
      <>
        {visibleNavRows.map((row, i) =>
          "section" in row ? (
            <div
              key={`s-${i}`}
              className="px-3 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-[0.05em] text-on-surface-variant/60"
            >
              {row.section}
            </div>
          ) : (
            <NavLink key={row.to} to={row.to} end={row.end} className={navLinkClass}>
              {({ isActive }) => (
                <>
                  <Icon name={row.icon} size={19} filled={isActive} className="shrink-0" />
                  <span>{row.label}</span>
                </>
              )}
            </NavLink>
          ),
        )}
      </>
    );
  }

  return (
    <div className="theme-admin flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-[260px] shrink-0 border-r border-outline-variant bg-surface-card md:block">
        <div className="flex h-16 items-center gap-2 px-6">
          <Logo />
          <span className="badge badge-primary">{isModerator ? "Moderator" : "Admin"}</span>
        </div>
        <nav className="aio-scroll flex max-h-[calc(100vh-4rem)] flex-col gap-0.5 overflow-y-auto px-3 pb-6">
          <NavList />
        </nav>
      </aside>

      {/* Mobile off-canvas drawer */}
      <div
        className={`fixed inset-0 z-50 md:hidden ${drawerOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!drawerOpen}
      >
        <div
          className={`absolute inset-0 bg-surface-deep/70 backdrop-blur-[12px] transition-opacity duration-300 ${
            drawerOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setDrawerOpen(false)}
        />
        <aside
          className={`glass absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col shadow-overlay transition-transform duration-300 ease-out ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-outline-variant px-4">
            <span className="flex items-center gap-2">
              <Logo />
              <span className="badge badge-primary">{isModerator ? "Moderator" : "Admin"}</span>
            </span>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setDrawerOpen(false)}
              className="flex h-11 w-11 items-center justify-center rounded-control text-on-surface-variant hover:bg-surface-container-highest"
            >
              <Icon name="close" size={20} />
            </button>
          </div>
          <div className="flex items-center gap-2 border-b border-outline-variant px-4 py-3 font-mono text-xs text-on-surface-variant">
            {user?.avatarUrl && (
              <img src={user.avatarUrl} alt="" className="h-7 w-7 rounded-full" referrerPolicy="no-referrer" />
            )}
            admin: @{user?.username}
          </div>
          <nav className="aio-scroll flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-3">
            <NavList />
          </nav>
          <div className="flex flex-col gap-2 border-t border-outline-variant p-3">
            <NavLink to="/dashboard" className="btn-ghost min-h-[44px] w-full justify-center text-sm">
              User panel
            </NavLink>
            <button type="button" onClick={handleLogout} className="btn-ghost min-h-[44px] w-full justify-center text-sm">
              Logout
            </button>
          </div>
        </aside>
      </div>

      {/* min-w-0 keeps wide tables scrolling internally instead of blowing out
          the page width on mobile. */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-outline-variant bg-surface-card/80 px-3 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-on-surface hover:bg-surface-container-highest md:hidden"
            >
              <Icon name="menu" size={22} />
            </button>
            <div className="hidden items-center gap-2 truncate font-mono text-sm text-on-surface-variant sm:flex">
              {user?.avatarUrl && (
                <img src={user.avatarUrl} alt="" className="h-6 w-6 rounded-full" referrerPolicy="no-referrer" />
              )}
              admin: @{user?.username}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <NavLink to="/dashboard" className="btn-ghost hidden !px-3 !py-1.5 text-xs sm:inline-flex">
              User panel
            </NavLink>
            <button className="btn-ghost hidden !px-3 !py-1.5 text-xs sm:inline-flex" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>
        <NoticeBar />
        <main className="flex-1 p-4 pb-24 sm:p-6 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="glass fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-outline-variant md:hidden">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition",
                isActive ? "text-accent-on-dark" : "text-on-surface-variant",
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={item.icon} size={22} filled={isActive} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-on-surface-variant"
        >
          <Icon name="more" size={22} />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
