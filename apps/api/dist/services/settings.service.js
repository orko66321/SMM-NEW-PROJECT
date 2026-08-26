import { prisma } from "../lib/prisma.js";
import { encrypt, decrypt } from "../lib/crypto.js";
import { env } from "../env.js";
// Deliberately a singleton row (fixed id) rather than a key/value table —
// see the model comment in schema.prisma. Upserted lazily on first read so
// the app works before any admin has ever opened the Settings page.
const SETTINGS_ID = "default";
async function ensureSettings() {
    return prisma.siteSettings.upsert({
        where: { id: SETTINGS_ID },
        update: {},
        create: { id: SETTINGS_ID },
    });
}
/** Admin-facing view — never returns the SMTP password, even encrypted, same treatment as gateway credentials. */
export async function getAdminSettings() {
    const s = await ensureSettings();
    return {
        siteName: s.siteName,
        whatsappEnabled: s.whatsappEnabled,
        whatsappNumber: s.whatsappNumber,
        liveChatProvider: s.liveChatProvider,
        liveChatWidgetId: s.liveChatWidgetId,
        usdToBdtRate: s.usdToBdtRate.toString(),
        defaultCurrency: s.defaultCurrency,
        smtpEnabled: s.smtpEnabled,
        smtpHost: s.smtpHost,
        smtpPort: s.smtpPort,
        smtpUser: s.smtpUser,
        smtpFromAddress: s.smtpFromAddress,
        smtpConfigured: !!s.smtpPassCiphertext,
    };
}
export async function updateSettings(input) {
    await ensureSettings();
    await prisma.siteSettings.update({
        where: { id: SETTINGS_ID },
        data: {
            siteName: input.siteName,
            whatsappEnabled: input.whatsappEnabled,
            whatsappNumber: input.whatsappNumber,
            liveChatProvider: input.liveChatProvider,
            liveChatWidgetId: input.liveChatWidgetId,
            usdToBdtRate: input.usdToBdtRate,
            defaultCurrency: input.defaultCurrency,
            smtpEnabled: input.smtpEnabled,
            smtpHost: input.smtpHost,
            smtpPort: input.smtpPort,
            smtpUser: input.smtpUser,
            // Omit smtpPassword to keep the existing encrypted value — the admin
            // UI never re-displays it after saving, so there's nothing to prefill.
            ...(input.smtpPassword ? { smtpPassCiphertext: encrypt(input.smtpPassword) } : {}),
            smtpFromAddress: input.smtpFromAddress,
        },
    });
}
/** Public — everything the landing page / dashboard chrome needs, nothing secret. */
export async function getPublicSettings() {
    const s = await ensureSettings();
    return {
        siteName: s.siteName,
        whatsappEnabled: s.whatsappEnabled,
        whatsappNumber: s.whatsappNumber,
        liveChatProvider: s.liveChatProvider,
        liveChatWidgetId: s.liveChatWidgetId,
        usdToBdtRate: s.usdToBdtRate.toString(),
        defaultCurrency: s.defaultCurrency,
        googleAuthEnabled: env.googleAuthEnabled,
    };
}
/** Internal only — the raw Decimal, for money math (services/payments/currency.ts), never string-formatted. */
export async function getUsdToBdtRate() {
    const s = await ensureSettings();
    return s.usdToBdtRate;
}
/**
 * Internal only — used exclusively by lib/mailer.ts to actually send email.
 * Never exposed through any route. Returns null if SMTP isn't fully
 * configured/enabled, so callers know to fall back rather than crash.
 */
export async function getSmtpConfig() {
    const s = await ensureSettings();
    if (!s.smtpEnabled || !s.smtpHost || !s.smtpPort || !s.smtpPassCiphertext || !s.smtpFromAddress) {
        return null;
    }
    return {
        host: s.smtpHost,
        port: s.smtpPort,
        user: s.smtpUser ?? undefined,
        pass: decrypt(s.smtpPassCiphertext),
        from: s.smtpFromAddress,
    };
}
