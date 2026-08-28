import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { walletRouter } from "./wallet.routes.js";
import { ordersRouter } from "./orders.routes.js";
import { servicesRouter } from "./services.routes.js";
import { ticketsRouter } from "./tickets.routes.js";
import { paymentsRouter } from "./payments.routes.js";
import { paymentMethodsRouter } from "./paymentMethods.routes.js";
import { couponsRouter } from "./coupons.routes.js";
import { publicRouter } from "./public.routes.js";
import { usersRouter } from "./users.routes.js";
import { storeRouter } from "./store.routes.js";
import { adminRouter } from "./admin/index.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/wallet", walletRouter);
apiRouter.use("/orders", ordersRouter);
apiRouter.use("/services", servicesRouter);
apiRouter.use("/tickets", ticketsRouter);
apiRouter.use("/payments", paymentsRouter);
apiRouter.use("/payment-methods", paymentMethodsRouter);
apiRouter.use("/coupons", couponsRouter);
apiRouter.use("/public", publicRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/store", storeRouter);
apiRouter.use("/admin", adminRouter);
