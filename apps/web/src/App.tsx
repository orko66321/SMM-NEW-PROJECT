import { Navigate, Route, Routes } from "react-router-dom";
import { ToastProvider } from "./components/ui/Toast.js";
import { AdminRoute, GuestRoute, ProtectedRoute } from "./routes/guards.js";
import DashboardLayout from "./components/layout/DashboardLayout.js";
import AdminLayout from "./components/layout/AdminLayout.js";

import Login from "./pages/auth/Login.js";
import Register from "./pages/auth/Register.js";
import Overview from "./pages/dashboard/Overview.js";
import NewOrder from "./pages/dashboard/NewOrder.js";
import OrdersHistory from "./pages/dashboard/OrdersHistory.js";
import Services from "./pages/dashboard/Services.js";
import Wallet from "./pages/dashboard/Wallet.js";
import Tickets from "./pages/dashboard/Tickets.js";
import TicketDetail from "./pages/dashboard/TicketDetail.js";

import AdminDashboard from "./pages/admin/Dashboard.js";
import AdminUsers from "./pages/admin/Users.js";
import AdminUserDetail from "./pages/admin/UserDetail.js";
import AdminServices from "./pages/admin/Services.js";
import AdminOrders from "./pages/admin/Orders.js";
import AdminDeposits from "./pages/admin/Deposits.js";
import AdminTickets from "./pages/admin/Tickets.js";
import AdminTicketDetail from "./pages/admin/TicketDetail.js";
import AdminProviders from "./pages/admin/Providers.js";
import AdminPaymentGateways from "./pages/admin/PaymentGateways.js";
import AdminPaymentMethods from "./pages/admin/PaymentMethods.js";

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Overview />} />
          <Route path="new-order" element={<NewOrder />} />
          <Route path="orders" element={<OrdersHistory />} />
          <Route path="services" element={<Services />} />
          <Route path="wallet" element={<Wallet />} />
          <Route path="tickets" element={<Tickets />} />
          <Route path="tickets/:id" element={<TicketDetail />} />
        </Route>

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="users/:id" element={<AdminUserDetail />} />
          <Route path="services" element={<AdminServices />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="deposits" element={<AdminDeposits />} />
          <Route path="tickets" element={<AdminTickets />} />
          <Route path="tickets/:id" element={<AdminTicketDetail />} />
          <Route path="providers" element={<AdminProviders />} />
          <Route path="payment-gateways" element={<AdminPaymentGateways />} />
          <Route path="payment-methods" element={<AdminPaymentMethods />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}
