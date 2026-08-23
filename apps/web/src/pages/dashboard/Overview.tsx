import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getMyOrders, getWallet } from "../../api/resources.js";
import { useAuth } from "../../context/AuthContext.js";

export default function Overview() {
  const { user } = useAuth();
  const { data: wallet } = useQuery({ queryKey: ["wallet"], queryFn: getWallet });
  const { data: orders } = useQuery({ queryKey: ["orders", "recent"], queryFn: () => getMyOrders({ page: 1, pageSize: 5 }) });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Welcome back, {user?.username}</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="label">Wallet Balance</p>
          <p className="font-mono text-2xl font-semibold text-success">${wallet?.balance ?? "0.00"}</p>
        </div>
        <div className="card">
          <p className="label">Total Orders</p>
          <p className="font-mono text-2xl font-semibold">{orders?.total ?? 0}</p>
        </div>
        <div className="card flex flex-col justify-between">
          <p className="label">Quick action</p>
          <Link to="/dashboard/new-order" className="btn-primary mt-2 justify-center">
            + New Order
          </Link>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-on-surface-variant">Recent orders</h2>
        {orders?.items.length ? (
          <ul className="divide-y divide-outline-variant">
            {orders.items.map((o: { id: string; service: { name: string }; quantity: number; charge: string; status: string }) => (
              <li key={o.id} className="flex items-center justify-between py-2 text-sm">
                <span className="truncate">{o.service.name}</span>
                <span className="font-mono text-on-surface-variant">{o.quantity}</span>
                <span className="font-mono">${o.charge}</span>
                <span className="badge bg-primary/15 text-primary">{o.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-on-surface-variant">No orders yet — place your first order to get started.</p>
        )}
      </div>
    </div>
  );
}
