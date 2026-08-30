import { Navigate, Route, Routes } from "react-router-dom";
import { ToastProvider } from "./components/ui/Toast.js";
import { AdminRoute, GuestRoute } from "./routes/guards.js";
import DashboardLayout from "./components/layout/DashboardLayout.js";
import AdminLayout from "./components/layout/AdminLayout.js";
import PublicLayout from "./components/layout/PublicLayout.js";
import HelpWidget from "./components/support/HelpWidget.js";
import LiveChatLoader from "./components/support/LiveChatLoader.js";

import Landing from "./pages/public/Landing.js";
import PublicServices from "./pages/public/PublicServices.js";
import ApiDocs from "./pages/public/ApiDocs.js";
import Docs from "./pages/public/Docs.js";
import DocDetail from "./pages/public/DocDetail.js";

import Login from "./pages/auth/Login.js";
import Register from "./pages/auth/Register.js";
import ForgotPassword from "./pages/auth/ForgotPassword.js";
import ResetPassword from "./pages/auth/ResetPassword.js";
import Overview from "./pages/dashboard/Overview.js";
import NewOrder from "./pages/dashboard/NewOrder.js";
import OrdersHistory from "./pages/dashboard/OrdersHistory.js";
import Services from "./pages/dashboard/Services.js";
import Wallet from "./pages/dashboard/Wallet.js";
import Tickets from "./pages/dashboard/Tickets.js";
import TicketDetail from "./pages/dashboard/TicketDetail.js";
import Profile from "./pages/dashboard/Profile.js";

import AdminDashboard from "./pages/admin/Dashboard.js";
import AdminUsers from "./pages/admin/Users.js";
import AdminUserDetail from "./pages/admin/UserDetail.js";
import AdminServices from "./pages/admin/Services.js";
import AdminOrders from "./pages/admin/Orders.js";
import AdminDeposits from "./pages/admin/Deposits.js";
import AdminTickets from "./pages/admin/Tickets.js";
import AdminTicketDetail from "./pages/admin/TicketDetail.js";
import AdminProviders from "./pages/admin/Providers.js";
import AdminProviderImport from "./pages/admin/ProviderImport.js";
import AdminPaymentGateways from "./pages/admin/PaymentGateways.js";
import AdminPaymentMethods from "./pages/admin/PaymentMethods.js";
import AdminSettings from "./pages/admin/Settings.js";
import AdminSupportChannels from "./pages/admin/SupportChannels.js";
import AdminNoticeSettings from "./pages/admin/NoticeSettings.js";
import AdminBanner from "./pages/admin/Banner.js";
import AdminPosts from "./pages/admin/Posts.js";
import AdminCoupons from "./pages/admin/Coupons.js";
import AdminBrands from "./pages/admin/Brands.js";
import AdminProducts from "./pages/admin/Products.js";
import AdminPackages from "./pages/admin/Packages.js";
import AdminStockPools from "./pages/admin/StockPools.js";

import Store from "./pages/dashboard/Store.js";
import Leaderboard from "./pages/dashboard/Leaderboard.js";

export default function App() {
  return (
    <ToastProvider>
      <LiveChatLoader />
      <HelpWidget />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/services" element={<PublicServices />} />
          <Route path="/api-docs" element={<ApiDocs />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/docs/:slug" element={<DocDetail />} />
        </Route>

        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
        <Route path="/reset-password" element={<GuestRoute><ResetPassword /></GuestRoute>} />

        {/* Guest-browsable: no auth guard here on purpose. Every page inside
            decides for itself what a logged-out visitor sees (full content
            for Services/New Order browsing, a GuestLockedCard for personal
            data, an AuthPromptModal on write actions) — see GuestGate.tsx.
            The real security boundary stays server-side: every mutating
            endpoint (POST /orders, /tickets, /wallet, ...) still requires
            `authenticate` in the API regardless of what this route renders. */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Overview />} />
          <Route path="store" element={<Store />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="new-order" element={<NewOrder />} />
          <Route path="orders" element={<OrdersHistory />} />
          <Route path="services" element={<Services />} />
          <Route path="wallet" element={<Wallet />} />
          <Route path="tickets" element={<Tickets />} />
          <Route path="tickets/:id" element={<TicketDetail />} />
          <Route path="profile" element={<Profile />} />
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
          <Route path="providers/:id/import" element={<AdminProviderImport />} />
          <Route path="payment-gateways" element={<AdminPaymentGateways />} />
          <Route path="payment-methods" element={<AdminPaymentMethods />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="support-channels" element={<AdminSupportChannels />} />
          <Route path="notice-settings" element={<AdminNoticeSettings />} />
          <Route path="banner" element={<AdminBanner />} />
          <Route path="posts" element={<AdminPosts />} />
          <Route path="coupons" element={<AdminCoupons />} />
          <Route path="brands" element={<AdminBrands />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="packages" element={<AdminPackages />} />
          <Route path="stock-pools" element={<AdminStockPools />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}
