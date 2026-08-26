import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext.js";
import { useCurrency } from "../../context/CurrencyContext.js";
import { getWallet } from "../../api/resources.js";
import NoticeBar from "./NoticeBar.js";
import CurrencySwitcher from "./CurrencySwitcher.js";
import { Logo } from "../Logo.js";

const navItems = [
  { to: "/dashboard", label: "Overview", end: true },
  { to: "/dashboard/new-order", label: "New Order" },
  { to: "/dashboard/orders", label: "Orders History" },
  { to: "/dashboard/services", label: "Services" },
  { to: "/dashboard/wallet", label: "Add Funds" },
  { to: "/dashboard/tickets", label: "Tickets Support" },
  { to: "/dashboard/profile", label: "Profile & Settings" },
];

const bottomNavItems = [
  { to: "/dashboard", label: "Home", end: true, icon: HomeIcon },
  { to: "/dashboard/new-order", label: "Order", icon: PlusIcon },
  { to: "/dashboard/services", label: "Services", icon: GridIcon },
  { to: "/dashboard/wallet", label: "Wallet", icon: WalletIcon },
  { to: "/dashboard/tickets", label: "Support", icon: SupportIcon },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { formatCurrency } = useCurrency();
  const { data: wallet } = useQuery({ queryKey: ["wallet"], queryFn: getWallet, refetchInterval: 30_000 });
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
      <aside className="hidden w-64 shrink-0 border-r border-outline-variant bg-surface-container md:block">
        <div className="flex h-16 items-center px-6">
          <Logo />
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
                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
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
          className={`absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col bg-surface-container shadow-2xl transition-transform duration-300 ease-out ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-outline-variant px-4">
            <Logo />
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setDrawerOpen(false)}
              className="flex h-11 w-11 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container-high"
            >
              <CloseIcon />
            </button>
          </div>
          <div className="flex items-center justify-between gap-2 border-b border-outline-variant px-4 py-3">
            <div className="flex items-center gap-2 font-mono text-xs text-on-surface-variant">
              {user?.avatarUrl && (
                <img src={user.avatarUrl} alt="" className="h-7 w-7 rounded-full" referrerPolicy="no-referrer" />
              )}
              @{user?.username}
            </div>
            <div className="rounded-md border border-outline-variant bg-surface-container-high px-2.5 py-1.5 font-mono text-xs text-success">
              {formatCurrency(wallet?.balance ?? 0)}
            </div>
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
                      : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-outline-variant p-3">
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

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-outline-variant bg-surface-container px-3 sm:px-6">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-on-surface hover:bg-surface-container-high md:hidden"
            >
              <MenuIcon />
            </button>
            <div className="hidden items-center gap-2 truncate font-mono text-sm text-on-surface-variant sm:flex">
              {user?.avatarUrl && (
                <img src={user.avatarUrl} alt="" className="h-6 w-6 rounded-full" referrerPolicy="no-referrer" />
              )}
              @{user?.username}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:block">
              <CurrencySwitcher />
            </div>
            <div className="rounded-md border border-outline-variant bg-surface-container-high px-2.5 py-1.5 font-mono text-xs text-success sm:px-3 sm:text-sm">
              {formatCurrency(wallet?.balance ?? 0)}
            </div>
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
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-outline-variant bg-surface-container-high/95 backdrop-blur-lg md:hidden">
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

function PlusIcon({ active }: { active?: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function GridIcon({ active }: { active?: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function WalletIcon({ active }: { active?: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <circle cx="16" cy="14" r="1" />
    </svg>
  );
}

function SupportIcon({ active }: { active?: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M12 3a9 9 0 0 0-9 9v4a2 2 0 0 0 2 2h1v-7H4a8 8 0 0 1 16 0h-2v7h1a2 2 0 0 0 2-2v-4a9 9 0 0 0-9-9Z" />
    </svg>
  );
}
