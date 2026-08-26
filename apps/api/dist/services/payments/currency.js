import { Prisma } from "#prisma/client";
import { getUsdToBdtRate } from "../settings.service.js";
/**
 * The one place a USD amount ever gets converted to another currency in
 * this codebase — every stored amount (Deposit.amount, Wallet.balance) is
 * USD everywhere else (see SiteSettings.usdToBdtRate's schema comment).
 * Called from inside a BDT-only gateway adapter's initiate() (zinipay.ts,
 * bkash.ts) right before building the outbound API request; nothing
 * downstream of that (the stored Deposit row, the eventual wallet credit)
 * ever sees this converted figure — see InitiatePaymentResult.gatewayAmount,
 * which exists purely for the admin audit trail and the soft mismatch
 * check in deposit.service.ts's confirmGatewayDeposit.
 *
 * Real bug this fixes: previously nothing in either adapter multiplied by
 * the rate at all — a $0.20 charge was sent to ZiniPay/bKash as "0.20",
 * meaning 0.20 BDT (worth a fraction of a cent) instead of 26.00 BDT at a
 * 130 rate. Two decimal places, standard rounding — BDT (like USD) doesn't
 * have a meaningful sub-poisha unit in these gateways' own APIs.
 */
export async function usdToGatewayBdt(usdAmount) {
    const rate = await getUsdToBdtRate();
    const bdt = new Prisma.Decimal(usdAmount).mul(rate);
    return bdt.toFixed(2);
}
