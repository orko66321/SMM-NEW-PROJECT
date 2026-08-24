import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext.js";
import { useCurrency } from "../../context/CurrencyContext.js";
import { getWallet } from "../../api/resources.js";
import NoticeBar from "./NoticeBar.js";
import CurrencySwitcher from "./CurrencySwitcher.js";

const navItems = [
  { to: "/dashboard", label: "Overview", end: true },
  { to: "/dashboard/new-order", label: "New Order" },
  { to: "/dashboard/orders", label: "Orders History" },
  { to: "/dashboard/services", label: "Services" },
  { to: "/dashboard/wallet", label: "Add Funds" },
  { to: "/dashboard/tickets", label: "Tickets Support" },
  { to: "/dashboard/profile", label: "Profile & Settings" },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const { data: wallet } = useQuery({ queryKey: ["wallet"], queryFn: getWallet, refetchInterval: 30_000 });

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-outline-variant bg-surface-container md:block">
        <div className="flex h-16 items-center px-6 font-display text-lg font-bold text-on-surface">SMM Panel</div>
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

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-outline-variant bg-surface-container px-6">
          <div className="font-mono text-sm text-on-surface-variant">@{user?.username}</div>
          <div className="flex items-center gap-3">
            <CurrencySwitcher />
            <div className="rounded-md border border-outline-variant bg-surface-container-high px-3 py-1.5 font-mono text-sm text-success">
              {formatCurrency(wallet?.balance ?? 0)}
            </div>
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
        <NoticeBar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
