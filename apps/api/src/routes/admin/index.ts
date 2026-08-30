import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { adminUsersRouter } from "./users.routes.js";
import { adminServicesRouter } from "./services.routes.js";
import { adminOrdersRouter } from "./orders.routes.js";
import { adminWalletRouter } from "./wallet.routes.js";
import { adminDepositsRouter } from "./deposits.routes.js";
import { adminTicketsRouter } from "./tickets.routes.js";
import { adminStatsRouter } from "./stats.routes.js";
import { adminProvidersRouter } from "./providers.routes.js";
import { adminPaymentGatewaysRouter } from "./paymentGateways.routes.js";
import { adminPaymentMethodsRouter } from "./paymentMethods.routes.js";
import { adminSettingsRouter } from "./settings.routes.js";
import { adminNoticesRouter } from "./notices.routes.js";
import { adminSiteNoticeRouter } from "./siteNotice.routes.js";
import { adminSupportChannelsRouter } from "./supportChannels.routes.js";
import { adminBannersRouter } from "./banners.routes.js";
import { adminPostsRouter } from "./posts.routes.js";
import { adminCouponsRouter } from "./coupons.routes.js";
import { adminBrandsRouter } from "./brands.routes.js";
import { adminProductsRouter } from "./products.routes.js";
import { adminPackagesRouter } from "./packages.routes.js";
import { adminStockPoolsRouter } from "./stockPools.routes.js";

export const adminRouter = Router();

// Every single route under /api/admin/* passes through both of these,
// with no exceptions — this is the one gate that must never be bypassed.
// `requireRole` checks the DB-verified role on `req.user` set by
// `authenticate`, so no request body/query/param can influence it
// (see middleware/auth.ts for why role tampering cannot work here).
//
// Phase 1 grants full admin access to the ADMIN role only. STAFF exists in
// the schema for the granular permission matrix planned in a later phase,
// but is intentionally granted nothing here yet — safer to under-grant
// than to accidentally over-grant a role before the permission model exists.
adminRouter.use(authenticate, requireRole("ADMIN"));

adminRouter.use("/users", adminUsersRouter);
adminRouter.use("/services", adminServicesRouter);
adminRouter.use("/orders", adminOrdersRouter);
adminRouter.use("/wallet", adminWalletRouter);
adminRouter.use("/deposits", adminDepositsRouter);
adminRouter.use("/tickets", adminTicketsRouter);
adminRouter.use("/stats", adminStatsRouter);
adminRouter.use("/providers", adminProvidersRouter);
adminRouter.use("/payment-gateways", adminPaymentGatewaysRouter);
adminRouter.use("/payment-methods", adminPaymentMethodsRouter);
adminRouter.use("/settings", adminSettingsRouter);
adminRouter.use("/notices", adminNoticesRouter);
adminRouter.use("/site-notice", adminSiteNoticeRouter);
adminRouter.use("/support-channels", adminSupportChannelsRouter);
adminRouter.use("/banners", adminBannersRouter);
adminRouter.use("/posts", adminPostsRouter);
adminRouter.use("/coupons", adminCouponsRouter);
adminRouter.use("/brands", adminBrandsRouter);
adminRouter.use("/products", adminProductsRouter);
adminRouter.use("/packages", adminPackagesRouter);
adminRouter.use("/stock-pools", adminStockPoolsRouter);
