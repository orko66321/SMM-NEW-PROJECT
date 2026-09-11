import { Prisma } from "#prisma/client";
import { prisma } from "../lib/prisma.js";
import { encrypt, decrypt } from "../lib/crypto.js";
import { env } from "../env.js";
import { AppError } from "../utils/AppError.js";
import { sendMail, isMailConfigured } from "../lib/mailer.js";
import { sendSms, isSmsConfigured } from "../lib/sms.js";
// Deliberately a singleton row (fixed id) rather than a key/value table —
// see the model comment in schema.prisma. Upserted lazily on first read so
// the app works before any admin has ever opened the Settings page.
const SETTINGS_ID = "default";
async function ensureSettings() {
    try {
        return await prisma.siteSettings.upsert({
            where: { id: SETTINGS_ID },
            update: {},
            create: { id: SETTINGS_ID },
        });
    }
    catch (err) {
        // Two callers racing the very first upsert (e.g. two of
        // notifications.service.ts's fire-and-forget event calls landing at the
        // same instant on a cold row) can both see "doesn't exist" and both try
        // to create it — the loser hits the @id unique constraint instead of a
        // clean update. The row now exists either way, so just re-read it.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
            return prisma.siteSettings.findUniqueOrThrow({ where: { id: SETTINGS_ID } });
        }
        throw err;
    }
}
/** Admin-facing view — never returns the SMTP password, even encrypted, same treatment as gateway credentials. */
export async function getAdminSettings() {
    const s = await ensureSettings();
    return {
        siteName: s.siteName,
        metaTitle: s.metaTitle,
        metaDescription: s.metaDescription,
        metaKeywords: s.metaKeywords,
        ogImageUrl: s.ogImageUrl,
        liveChatProvider: s.liveChatProvider,
        liveChatWidgetId: s.liveChatWidgetId,
        howToOrderVideoUrl: s.howToOrderVideoUrl,
        mainLogo: s.mainLogo,
        walletLogo: s.walletLogo,
        autoPayLogo: s.autoPayLogo,
        icon512: s.icon512,
        icon192: s.icon192,
        icon512Alt: s.icon512Alt,
        siteColor: s.siteColor,
        modalEnabled: s.modalEnabled,
        modalBannerImage: s.modalBannerImage,
        modalText: s.modalText,
        modalButtonText: s.modalButtonText,
        modalButtonLink: s.modalButtonLink,
        usdToBdtRate: s.usdToBdtRate.toString(),
        defaultCurrency: s.defaultCurrency,
        smtpEnabled: s.smtpEnabled,
        smtpHost: s.smtpHost,
        smtpPort: s.smtpPort,
        smtpUser: s.smtpUser,
        smtpFromAddress: s.smtpFromAddress,
        smtpConfigured: !!s.smtpPassCiphertext,
        smsEnabled: s.smsEnabled,
        smsApiKeyConfigured: !!s.smsApiKeyCiphertext,
        smsWelcomeEnabled: s.smsWelcomeEnabled,
        smsWelcomeTemplate: s.smsWelcomeTemplate,
        smsAddFundEnabled: s.smsAddFundEnabled,
        smsAddFundTemplate: s.smsAddFundTemplate,
        smsOrderConfirmationEnabled: s.smsOrderConfirmationEnabled,
        smsOrderConfirmationTemplate: s.smsOrderConfirmationTemplate,
        emailWelcomeEnabled: s.emailWelcomeEnabled,
        emailWelcomeSubject: s.emailWelcomeSubject,
        emailWelcomeTemplate: s.emailWelcomeTemplate,
        emailAddFundSuccessEnabled: s.emailAddFundSuccessEnabled,
        emailAddFundSuccessSubject: s.emailAddFundSuccessSubject,
        emailAddFundSuccessTemplate: s.emailAddFundSuccessTemplate,
        emailAddFundFailedEnabled: s.emailAddFundFailedEnabled,
        emailAddFundFailedSubject: s.emailAddFundFailedSubject,
        emailAddFundFailedTemplate: s.emailAddFundFailedTemplate,
        emailOrderSuccessEnabled: s.emailOrderSuccessEnabled,
        emailOrderSuccessSubject: s.emailOrderSuccessSubject,
        emailOrderSuccessTemplate: s.emailOrderSuccessTemplate,
        emailOrderFailedEnabled: s.emailOrderFailedEnabled,
        emailOrderFailedSubject: s.emailOrderFailedSubject,
        emailOrderFailedTemplate: s.emailOrderFailedTemplate,
        resendOrderButtonEnabled: s.resendOrderButtonEnabled,
        firstDepositBonusEnabled: s.firstDepositBonusEnabled,
        firstDepositBonusPercent: s.firstDepositBonusPercent.toString(),
        firstDepositMinAmount: s.firstDepositMinAmount.toString(),
        firstDepositMaxBonus: s.firstDepositMaxBonus.toString(),
        referralSystemEnabled: s.referralSystemEnabled,
        referrerRewardType: s.referrerRewardType,
        referrerRewardValue: s.referrerRewardValue.toString(),
        refereeBonusPercent: s.refereeBonusPercent.toString(),
        avgCompletionSampleSize: s.avgCompletionSampleSize,
        recentlyCompletedWindowHours: s.recentlyCompletedWindowHours,
    };
}
/** Kill-switch for the admin Orders "Resend to provider" button + endpoint. */
export async function isResendOrderButtonEnabled() {
    const s = await ensureSettings();
    return s.resendOrderButtonEnabled;
}
export async function updateSettings(input) {
    await ensureSettings();
    await prisma.siteSettings.update({
        where: { id: SETTINGS_ID },
        data: {
            siteName: input.siteName,
            // Same normalise-"" ⇒ null / skip-undefined treatment as
            // howToOrderVideoUrl below, so the admin can clear a field and the
            // frontend's simple null check works.
            metaTitle: input.metaTitle === undefined ? undefined : input.metaTitle || null,
            metaDescription: input.metaDescription === undefined ? undefined : input.metaDescription || null,
            metaKeywords: input.metaKeywords === undefined ? undefined : input.metaKeywords || null,
            ogImageUrl: input.ogImageUrl === undefined ? undefined : input.ogImageUrl || null,
            // Logo & Icon settings — same normalise-"" ⇒ null / skip-undefined
            // treatment; "" is how the admin UI signals "remove this image".
            mainLogo: input.mainLogo === undefined ? undefined : input.mainLogo || null,
            walletLogo: input.walletLogo === undefined ? undefined : input.walletLogo || null,
            autoPayLogo: input.autoPayLogo === undefined ? undefined : input.autoPayLogo || null,
            icon512: input.icon512 === undefined ? undefined : input.icon512 || null,
            icon192: input.icon192 === undefined ? undefined : input.icon192 || null,
            icon512Alt: input.icon512Alt === undefined ? undefined : input.icon512Alt || null,
            siteColor: input.siteColor === undefined ? undefined : input.siteColor || null,
            // Announcement modal — same normalise-"" ⇒ null / skip-undefined; the
            // boolean toggle is only written when the client actually sent it.
            ...(input.modalEnabled === undefined ? {} : { modalEnabled: input.modalEnabled }),
            modalBannerImage: input.modalBannerImage === undefined ? undefined : input.modalBannerImage || null,
            modalText: input.modalText === undefined ? undefined : input.modalText || null,
            modalButtonText: input.modalButtonText === undefined ? undefined : input.modalButtonText || null,
            modalButtonLink: input.modalButtonLink === undefined ? undefined : input.modalButtonLink || null,
            liveChatProvider: input.liveChatProvider,
            liveChatWidgetId: input.liveChatWidgetId,
            // Normalise "" (admin cleared the field) to null so the frontend's
            // empty check is a simple null/falsy test; leave an omitted field
            // untouched (undefined ⇒ Prisma skips it).
            howToOrderVideoUrl: input.howToOrderVideoUrl === undefined ? undefined : input.howToOrderVideoUrl || null,
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
            ...(input.smsEnabled === undefined ? {} : { smsEnabled: input.smsEnabled }),
            // Omit smsApiKey to keep the existing encrypted value — same
            // never-re-displayed-after-saving treatment as smtpPassword above.
            ...(input.smsApiKey ? { smsApiKeyCiphertext: encrypt(input.smsApiKey) } : {}),
            ...(input.smsWelcomeEnabled === undefined ? {} : { smsWelcomeEnabled: input.smsWelcomeEnabled }),
            smsWelcomeTemplate: input.smsWelcomeTemplate === undefined ? undefined : input.smsWelcomeTemplate || null,
            ...(input.smsAddFundEnabled === undefined ? {} : { smsAddFundEnabled: input.smsAddFundEnabled }),
            smsAddFundTemplate: input.smsAddFundTemplate === undefined ? undefined : input.smsAddFundTemplate || null,
            ...(input.smsOrderConfirmationEnabled === undefined
                ? {}
                : { smsOrderConfirmationEnabled: input.smsOrderConfirmationEnabled }),
            smsOrderConfirmationTemplate: input.smsOrderConfirmationTemplate === undefined ? undefined : input.smsOrderConfirmationTemplate || null,
            ...(input.emailWelcomeEnabled === undefined ? {} : { emailWelcomeEnabled: input.emailWelcomeEnabled }),
            emailWelcomeSubject: input.emailWelcomeSubject === undefined ? undefined : input.emailWelcomeSubject || null,
            emailWelcomeTemplate: input.emailWelcomeTemplate === undefined ? undefined : input.emailWelcomeTemplate || null,
            ...(input.emailAddFundSuccessEnabled === undefined
                ? {}
                : { emailAddFundSuccessEnabled: input.emailAddFundSuccessEnabled }),
            emailAddFundSuccessSubject: input.emailAddFundSuccessSubject === undefined ? undefined : input.emailAddFundSuccessSubject || null,
            emailAddFundSuccessTemplate: input.emailAddFundSuccessTemplate === undefined ? undefined : input.emailAddFundSuccessTemplate || null,
            ...(input.emailAddFundFailedEnabled === undefined
                ? {}
                : { emailAddFundFailedEnabled: input.emailAddFundFailedEnabled }),
            emailAddFundFailedSubject: input.emailAddFundFailedSubject === undefined ? undefined : input.emailAddFundFailedSubject || null,
            emailAddFundFailedTemplate: input.emailAddFundFailedTemplate === undefined ? undefined : input.emailAddFundFailedTemplate || null,
            ...(input.emailOrderSuccessEnabled === undefined
                ? {}
                : { emailOrderSuccessEnabled: input.emailOrderSuccessEnabled }),
            emailOrderSuccessSubject: input.emailOrderSuccessSubject === undefined ? undefined : input.emailOrderSuccessSubject || null,
            emailOrderSuccessTemplate: input.emailOrderSuccessTemplate === undefined ? undefined : input.emailOrderSuccessTemplate || null,
            ...(input.emailOrderFailedEnabled === undefined
                ? {}
                : { emailOrderFailedEnabled: input.emailOrderFailedEnabled }),
            emailOrderFailedSubject: input.emailOrderFailedSubject === undefined ? undefined : input.emailOrderFailedSubject || null,
            emailOrderFailedTemplate: input.emailOrderFailedTemplate === undefined ? undefined : input.emailOrderFailedTemplate || null,
            // Omitted by an older admin client ⇒ leave the stored value alone.
            ...(input.resendOrderButtonEnabled === undefined
                ? {}
                : { resendOrderButtonEnabled: input.resendOrderButtonEnabled }),
            ...(input.firstDepositBonusEnabled === undefined ? {} : { firstDepositBonusEnabled: input.firstDepositBonusEnabled }),
            ...(input.firstDepositBonusPercent === undefined ? {} : { firstDepositBonusPercent: input.firstDepositBonusPercent }),
            ...(input.firstDepositMinAmount === undefined ? {} : { firstDepositMinAmount: input.firstDepositMinAmount }),
            ...(input.firstDepositMaxBonus === undefined ? {} : { firstDepositMaxBonus: input.firstDepositMaxBonus }),
            ...(input.referralSystemEnabled === undefined ? {} : { referralSystemEnabled: input.referralSystemEnabled }),
            ...(input.referrerRewardType === undefined ? {} : { referrerRewardType: input.referrerRewardType }),
            ...(input.referrerRewardValue === undefined ? {} : { referrerRewardValue: input.referrerRewardValue }),
            ...(input.refereeBonusPercent === undefined ? {} : { refereeBonusPercent: input.refereeBonusPercent }),
            ...(input.avgCompletionSampleSize === undefined ? {} : { avgCompletionSampleSize: input.avgCompletionSampleSize }),
            ...(input.recentlyCompletedWindowHours === undefined
                ? {}
                : { recentlyCompletedWindowHours: input.recentlyCompletedWindowHours }),
        },
    });
}
/** Public — everything the landing page / dashboard chrome needs, nothing secret. */
export async function getPublicSettings() {
    const s = await ensureSettings();
    return {
        siteName: s.siteName,
        metaTitle: s.metaTitle,
        metaDescription: s.metaDescription,
        metaKeywords: s.metaKeywords,
        ogImageUrl: s.ogImageUrl,
        liveChatProvider: s.liveChatProvider,
        liveChatWidgetId: s.liveChatWidgetId,
        howToOrderVideoUrl: s.howToOrderVideoUrl,
        mainLogo: s.mainLogo,
        icon512: s.icon512,
        icon192: s.icon192,
        icon512Alt: s.icon512Alt,
        siteColor: s.siteColor,
        modalEnabled: s.modalEnabled,
        modalBannerImage: s.modalBannerImage,
        modalText: s.modalText,
        modalButtonText: s.modalButtonText,
        modalButtonLink: s.modalButtonLink,
        usdToBdtRate: s.usdToBdtRate.toString(),
        defaultCurrency: s.defaultCurrency,
        googleAuthEnabled: env.googleAuthEnabled,
        firstDepositBonusEnabled: s.firstDepositBonusEnabled,
        firstDepositBonusPercent: s.firstDepositBonusPercent.toString(),
        firstDepositMinAmount: s.firstDepositMinAmount.toString(),
        firstDepositMaxBonus: s.firstDepositMaxBonus.toString(),
        referralSystemEnabled: s.referralSystemEnabled,
        referrerRewardType: s.referrerRewardType,
        referrerRewardValue: s.referrerRewardValue.toString(),
        refereeBonusPercent: s.refereeBonusPercent.toString(),
        recentlyCompletedWindowHours: s.recentlyCompletedWindowHours,
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
/**
 * Admin-only "Send test email" action — lets the operator confirm the saved
 * SMTP config actually works right after saving it, without triggering a real
 * password-reset flow. Always uses the saved SMTP password (via
 * getSmtpConfig/sendMail); the caller only supplies the destination.
 */
export async function sendTestEmail(to) {
    if (!(await isMailConfigured())) {
        throw AppError.badRequest("Email isn't configured — either set BREVO_API_KEY + MAIL_FROM on the API server (recommended on Railway), or fill in and save the SMTP settings below (host, port, password, from-address)");
    }
    const s = await ensureSettings();
    try {
        await sendMail(to, `SMTP test — ${s.siteName}`, "This is a test email from your admin panel. If you received it, SMTP is working.");
    }
    catch (err) {
        // Surface the mail-server error (auth failed, self-signed cert, …) so the
        // operator can fix their config — but never a stack trace.
        throw AppError.badRequest(err instanceof Error ? err.message : "Failed to send test email");
    }
}
// Built-in wording used whenever the admin hasn't (yet) overridden a
// template. `{{placeholder}}` tokens are filled in by
// services/notifications.service.ts — keep any new placeholder documented
// there too.
export const DEFAULT_SMS_TEMPLATES = {
    welcome: "Welcome to {{siteName}}, {{username}}! Your account is ready — start ordering now.",
    addFund: "{{siteName}}: Your deposit of {{amount}} has been credited. New wallet balance: {{balance}}.",
    orderConfirmation: "{{siteName}}: Order #{{orderId}} for {{service}} (qty {{quantity}}) placed successfully.",
};
/**
 * Internal only — used exclusively by lib/sms.ts to actually send an SMS,
 * and by services/notifications.service.ts to read the per-event templates.
 * Never exposed through any route. Returns null if SMS isn't fully
 * configured/enabled, so callers know to skip rather than crash.
 */
export async function getSmsConfig() {
    const s = await ensureSettings();
    if (!s.smsEnabled || !s.smsApiKeyCiphertext)
        return null;
    return {
        apiKey: decrypt(s.smsApiKeyCiphertext),
        welcomeEnabled: s.smsWelcomeEnabled,
        welcomeTemplate: s.smsWelcomeTemplate || DEFAULT_SMS_TEMPLATES.welcome,
        addFundEnabled: s.smsAddFundEnabled,
        addFundTemplate: s.smsAddFundTemplate || DEFAULT_SMS_TEMPLATES.addFund,
        orderConfirmationEnabled: s.smsOrderConfirmationEnabled,
        orderConfirmationTemplate: s.smsOrderConfirmationTemplate || DEFAULT_SMS_TEMPLATES.orderConfirmation,
        siteName: s.siteName,
    };
}
// Built-in wording for the email-notification templates — same role as
// DEFAULT_SMS_TEMPLATES above, for services/notifications.service.ts.
export const DEFAULT_EMAIL_TEMPLATES = {
    welcome: {
        subject: "Welcome to {{siteName}}!",
        body: "Hi {{username}},\n\nWelcome to {{siteName}}! Your account is ready — you can start ordering right away.\n\nThanks,\n{{siteName}} Team",
    },
    addFundSuccess: {
        subject: "Deposit confirmed — {{siteName}}",
        body: "Hi {{username}},\n\nYour deposit of {{amount}} has been credited. Your new wallet balance is {{balance}}.\n\nThanks,\n{{siteName}} Team",
    },
    addFundFailed: {
        subject: "Deposit not approved — {{siteName}}",
        body: "Hi {{username}},\n\nYour deposit of {{amount}} could not be approved. If you believe this is a mistake, please contact support.\n\n{{siteName}} Team",
    },
    orderSuccess: {
        subject: "Order placed — #{{orderId}}",
        body: "Hi {{username}},\n\nYour order #{{orderId}} for {{service}} (qty {{quantity}}) has been placed successfully.\n\nThanks,\n{{siteName}} Team",
    },
    orderFailed: {
        subject: "Order failed — #{{orderId}}",
        body: "Hi {{username}},\n\nUnfortunately your order #{{orderId}} for {{service}} could not be completed. {{refundAmount}} has been refunded to your wallet.\n\n{{siteName}} Team",
    },
};
/**
 * Internal only — used exclusively by services/notifications.service.ts to
 * read the per-event email toggles/templates. There's no "is email
 * configured" gate here (unlike getSmsConfig's key check) — lib/mailer.ts's
 * sendMail already no-ops safely when nothing's set up, so callers just call
 * it and let that happen.
 */
export async function getEmailNotificationConfig() {
    const s = await ensureSettings();
    return {
        siteName: s.siteName,
        welcomeEnabled: s.emailWelcomeEnabled,
        welcomeSubject: s.emailWelcomeSubject || DEFAULT_EMAIL_TEMPLATES.welcome.subject,
        welcomeTemplate: s.emailWelcomeTemplate || DEFAULT_EMAIL_TEMPLATES.welcome.body,
        addFundSuccessEnabled: s.emailAddFundSuccessEnabled,
        addFundSuccessSubject: s.emailAddFundSuccessSubject || DEFAULT_EMAIL_TEMPLATES.addFundSuccess.subject,
        addFundSuccessTemplate: s.emailAddFundSuccessTemplate || DEFAULT_EMAIL_TEMPLATES.addFundSuccess.body,
        addFundFailedEnabled: s.emailAddFundFailedEnabled,
        addFundFailedSubject: s.emailAddFundFailedSubject || DEFAULT_EMAIL_TEMPLATES.addFundFailed.subject,
        addFundFailedTemplate: s.emailAddFundFailedTemplate || DEFAULT_EMAIL_TEMPLATES.addFundFailed.body,
        orderSuccessEnabled: s.emailOrderSuccessEnabled,
        orderSuccessSubject: s.emailOrderSuccessSubject || DEFAULT_EMAIL_TEMPLATES.orderSuccess.subject,
        orderSuccessTemplate: s.emailOrderSuccessTemplate || DEFAULT_EMAIL_TEMPLATES.orderSuccess.body,
        orderFailedEnabled: s.emailOrderFailedEnabled,
        orderFailedSubject: s.emailOrderFailedSubject || DEFAULT_EMAIL_TEMPLATES.orderFailed.subject,
        orderFailedTemplate: s.emailOrderFailedTemplate || DEFAULT_EMAIL_TEMPLATES.orderFailed.body,
    };
}
/**
 * Admin-only "Send test SMS" action (Settings → SMS Notifications) — same
 * shape/purpose as sendTestEmail above. Always uses the saved API key; the
 * caller only supplies the destination number.
 */
export async function sendTestSms(to) {
    if (!(await isSmsConfigured())) {
        throw AppError.badRequest("SMS isn't configured — enable it below and save an API key first");
    }
    const s = await ensureSettings();
    try {
        await sendSms(to, `${s.siteName}: This is a test SMS from your admin panel. If you received it, SMS is working.`);
    }
    catch (err) {
        throw AppError.badRequest(err instanceof Error ? err.message : "Failed to send test SMS");
    }
}
