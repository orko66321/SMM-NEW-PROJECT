import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.js";
import NoticeBar from "./NoticeBar.js";
import { Logo } from "../Logo.js";

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
  { to: "/admin/coupons", label: "Coupons" },
  { to: "/admin/notice-settings", label: "Notice Settings" },
  { to: "/admin/settings", label: "Settings" },
];

const bottomNavItems = [
  { to: "/admin", label: "Home", end: true, icon: HomeIcon },
  { to: "/admin/users", label: "Users", icon: UsersIcon },
  { to: "/admin/orders", label: "Orders", icon: OrdersIcon },
  { to: "/admin/deposits", label: "Deposits", icon: DepositsIcon },
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

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-outline-variant bg-surface-container-high md:block">
        <div className="flex h-16 items-center gap-2 px-6">
          <Logo />
          <span className="badge bg-primary/20 text-primary">Admin</span>
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

      {/* Mobile off-canvas drawer */}
      <div
        className={`fixed inset-0 z-50 md:hidden ${drawerOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!drawerOpen}
      >
        <div
          className={`absolute inset-0 bg-surface-deep/70 backdrop-blur-sm transition-opacity duration-300 ${
            drawerOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setDrawerOpen(false)}
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col bg-surface-container-high shadow-2xl transition-transform duration-300 ease-out ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-outline-variant px-4">
            <span className="flex items-center gap-2">
              <Logo />
              <span className="badge bg-primary/20 text-primary">Admin</span>
            </span>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setDrawerOpen(false)}
              className="flex h-11 w-11 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container-highest"
            >
              <CloseIcon />
            </button>
          </div>
          <div className="flex items-center gap-2 border-b border-outline-variant px-4 py-3 font-mono text-xs text-on-surface-variant">
            {user?.avatarUrl && (
              <img src={user.avatarUrl} alt="" className="h-7 w-7 rounded-full" referrerPolicy="no-referrer" />
            )}
            admin: @{user?.username}
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-h-[44px] items-center rounded-md px-3 py-2.5 text-sm font-medium transition ${
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
          <div className="flex flex-col gap-2 border-t border-outline-variant p-3">
            <NavLink to="/dashboard" className="btn-ghost min-h-[44px] w-full justify-center text-sm">
              User panel
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              className="btn-ghost min-h-[44px] w-full justify-center text-sm"
            >
              Logout
            </button>
          </div>
        </aside>
      </div>

      {/* min-w-0 overrides the flex item's default min-width:auto — without
          it, any wide descendant (e.g. a data table or a non-wrapping row
          of filter pills) forces this whole column wider than the viewport
          instead of scrolling internally, blowing out the page horizontally
          on mobile. */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-outline-variant bg-surface-container-high px-3 sm:px-6">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-on-surface hover:bg-surface-container-highest md:hidden"
            >
              <MenuIcon />
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
            <button
              className="btn-ghost hidden !px-3 !py-1.5 text-xs sm:inline-flex"
              onClick={handleLogout}
            >
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
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-outline-variant bg-surface-container-highest/95 backdrop-blur-lg md:hidden">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition ${
                isActive ? "text-primary" : "text-on-surface-variant"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon active={isActive} />
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
          <MoreIcon />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function iconProps(active?: boolean) {
  return { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: active ? 2.4 : 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
}

function HomeIcon({ active }: { active?: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

function UsersIcon({ active }: { active?: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 8.5a3 3 0 1 1 0 6" />
      <path d="M21 20c0-2.8-1.9-5.1-4.5-5.8" />
    </svg>
  );
}

function OrdersIcon({ active }: { active?: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M4 7h16l-1.5 12.2a2 2 0 0 1-2 1.8H7.5a2 2 0 0 1-2-1.8L4 7Z" />
      <path d="M8 7V5a4 4 0 0 1 8 0v2" />
    </svg>
  );
}

function DepositsIcon({ active }: { active?: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <circle cx="16" cy="14" r="1" />
    </svg>
  );
}

function MoreIcon({ active }: { active?: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  );
}
