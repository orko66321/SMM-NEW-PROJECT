import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AssignableRoleValues, type Role } from "@smm/shared";
import { adjustUserWallet, getAdminUser, updateAdminUser } from "../../api/resources.js";
import { apiErrorMessage } from "../../api/client.js";
import { useToast } from "../../components/ui/Toast.js";
import { useAuth } from "../../context/AuthContext.js";
import { Badge, Breadcrumbs } from "../../components/ds/index.js";

const ROLE_LABELS: Record<Role, string> = { USER: "User", MODERATOR: "Moderator", ADMIN: "Admin" };

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { data: user } = useQuery({ queryKey: ["admin-user", id], queryFn: () => getAdminUser(id!), enabled: !!id });

  const [amount, setAmount] = useState<number | "">("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState<Role>("USER");
  const [savingRole, setSavingRole] = useState(false);

  useEffect(() => {
    if (user?.role) setRole(user.role as Role);
  }, [user?.role]);

  const isSelf = !!currentUser && currentUser.id === id;
  const canEditRoles = currentUser?.role === "ADMIN";

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["admin-user", id] });
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  }

  async function onAdjust(e: FormEvent) {
    e.preventDefault();
    if (!id || !amount || !reason) return;
    setSubmitting(true);
    try {
      await adjustUserWallet(id, { amount: Number(amount), reason });
      toast.push("Wallet adjusted.", "success");
      setAmount("");
      setReason("");
      refresh();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to adjust wallet"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleStatus() {
    if (!id || !user) return;
    try {
      await updateAdminUser(id, { status: user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" });
      toast.push("User status updated.", "success");
      refresh();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to update status"), "error");
    }
  }

  async function toggleVip() {
    if (!id || !user) return;
    try {
      await updateAdminUser(id, { isVip: !user.isVip });
      toast.push(user.isVip ? "VIP access removed." : "VIP access granted.", "success");
      refresh();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to update VIP status"), "error");
    }
  }

  async function toggleReseller() {
    if (!id || !user) return;
    try {
      await updateAdminUser(id, { isReseller: !user.isReseller });
      toast.push(user.isReseller ? "Reseller access removed." : "Reseller access granted.", "success");
      refresh();
    } catch (err) {
      toast.push(apiErrorMessage(err, "Failed to update reseller status"), "error");
    }
  }

  async function saveRole() {
    if (!id || !user || role === user.role) return;
    setSavingRole(true);
    try {
      await updateAdminUser(id, { role });
      toast.push(`Role updated to ${ROLE_LABELS[role]}.`, "success");
      refresh();
    } catch (err) {
      setRole(user.role as Role); // revert the select on failure
      toast.push(apiErrorMessage(err, "Failed to update role"), "error");
    } finally {
      setSavingRole(false);
    }
  }

  if (!user) return <p className="text-on-surface-variant">Loading…</p>;

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Users", to: "/admin/users" }, { label: `@${user.username}` }]} />
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="card space-y-3 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold break-all">@{user.username}</h1>
          <Badge tone={user.status === "ACTIVE" ? "success" : "error"}>{user.status}</Badge>
        </div>
        <p className="text-sm text-on-surface-variant break-all">{user.email}</p>
        <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-3">
          <div>
            <p className="label">Balance</p>
            <p className="font-mono text-lg text-success">${user.wallet?.balance ?? "0"}</p>
          </div>
          <div>
            <p className="label">Orders</p>
            <p className="font-mono text-lg">{user._count?.orders ?? 0}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={user.role === "ADMIN" ? "primary" : user.role === "MODERATOR" ? "warning" : "neutral"}>
              {ROLE_LABELS[user.role as Role] ?? user.role}
            </Badge>
            {user.isVip && <Badge tone="primary">VIP</Badge>}
            {user.isReseller && <Badge tone="primary">Reseller</Badge>}
          </div>
        </div>

        {/* Role management (ADMIN only) */}
        <div className="mt-3 rounded-card border border-outline-variant p-4">
          <p className="label">Role</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <select
              className="input-field max-w-[200px]"
              value={role}
              disabled={!canEditRoles || isSelf}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {AssignableRoleValues.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
            <button
              className="btn-primary"
              onClick={saveRole}
              disabled={!canEditRoles || isSelf || savingRole || role === user.role}
            >
              {savingRole ? "Saving…" : "Save role"}
            </button>
          </div>
          <p className="mt-2 text-xs text-on-surface-variant">
            {!canEditRoles
              ? "Only an Admin can change roles."
              : isSelf
                ? "You can't change your own role."
                : "Admin = full access. Moderator = support agent (view everything, work tickets / deposits / order status; no settings, wallet, catalogue or role changes)."}
          </p>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={toggleStatus} disabled={isSelf}>
            {user.status === "ACTIVE" ? "Suspend user" : "Reactivate user"}
          </button>
          <button className="btn-ghost" onClick={toggleVip}>
            {user.isVip ? "Remove VIP access" : "Grant VIP access"}
          </button>
          <button className="btn-ghost" onClick={toggleReseller}>
            {user.isReseller ? "Remove reseller access" : "Grant reseller access"}
          </button>
        </div>
        <p className="mt-1 text-xs text-on-surface-variant">
          VIP and Reseller are Store Access-Type grants, independent of role. Reseller access is also granted automatically once a user generates a reseller API key.
        </p>
      </div>

      <form onSubmit={onAdjust} className="card h-fit space-y-4">
        <h2 className="text-lg font-bold">Adjust Wallet</h2>
        <p className="text-xs text-on-surface-variant">Positive to credit, negative to debit. Every adjustment is written to the admin audit log.</p>
        <div>
          <label className="label" htmlFor="amount">Amount</label>
          <input id="amount" type="number" step="0.01" className="input-field" value={amount} onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : "")} required />
        </div>
        <div>
          <label className="label" htmlFor="reason">Reason</label>
          <input id="reason" className="input-field" value={reason} onChange={(e) => setReason(e.target.value)} required />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={submitting}>{submitting ? "Applying…" : "Apply adjustment"}</button>
      </form>
    </div>
    </div>
  );
}
