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
import { adminCommentTemplatesRouter } from "./commentTemplates.routes.js";
import { adminReferralRouter } from "./referral.routes.js";

export const adminRouter = Router();

// Every route under /api/admin/* is authenticated and role-gated here —
// `requireRole` checks the DB-verified role on `req.user` set by
// `authenticate`, so no request body/query/param can influence it
// (see middleware/auth.ts for why role tampering cannot work here).
//
// Two tiers:
//   ADMIN     — everything.
//   MODERATOR — support agent: read the whole panel + work tickets, review
//               deposits, change order status. The `adminOnly` sub-routers
//               below (settings, wallet, catalogue, gateways, role changes)
//               reject MODERATOR.
adminRouter.use(authenticate, requireRole("ADMIN", "MODERATOR"));

const adminOnly = requireRole("ADMIN");

// ── Shared by ADMIN + MODERATOR ─────────────────────────────────────────
adminRouter.use("/stats", adminStatsRouter);
adminRouter.use("/users", adminUsersRouter); // list/detail open; PATCH is adminOnly inside the router
adminRouter.use("/orders", adminOrdersRouter);
adminRouter.use("/deposits", adminDepositsRouter);
adminRouter.use("/tickets", adminTicketsRouter);

// ── ADMIN only ─────────────────────────────────────────────────────────
adminRouter.use("/services", adminOnly, adminServicesRouter);
adminRouter.use("/wallet", adminOnly, adminWalletRouter);
adminRouter.use("/providers", adminOnly, adminProvidersRouter);
adminRouter.use("/payment-gateways", adminOnly, adminPaymentGatewaysRouter);
adminRouter.use("/payment-methods", adminOnly, adminPaymentMethodsRouter);
adminRouter.use("/settings", adminOnly, adminSettingsRouter);
adminRouter.use("/notices", adminOnly, adminNoticesRouter);
adminRouter.use("/site-notice", adminOnly, adminSiteNoticeRouter);
adminRouter.use("/support-channels", adminOnly, adminSupportChannelsRouter);
adminRouter.use("/banners", adminOnly, adminBannersRouter);
adminRouter.use("/posts", adminOnly, adminPostsRouter);
adminRouter.use("/coupons", adminOnly, adminCouponsRouter);
adminRouter.use("/comment-templates", adminOnly, adminCommentTemplatesRouter);
adminRouter.use("/referral", adminOnly, adminReferralRouter);
adminRouter.use("/brands", adminOnly, adminBrandsRouter);
adminRouter.use("/products", adminOnly, adminProductsRouter);
adminRouter.use("/packages", adminOnly, adminPackagesRouter);
adminRouter.use("/stock-pools", adminOnly, adminStockPoolsRouter);
