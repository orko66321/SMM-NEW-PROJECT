import type { PaymentGatewayKey, UpdateGatewayConfigInput } from "@smm/shared";
import { PaymentGatewayKeys, gatewayCredentialsSchemas } from "@smm/shared";
import { prisma } from "../../lib/prisma.js";
import { encrypt, decrypt } from "../../lib/crypto.js";
import { AppError } from "../../utils/AppError.js";

/** Admin-facing list — never includes decrypted credentials. */
export async function listGatewayConfigs() {
  const configs = await prisma.paymentGatewayConfig.findMany();
  const byKey = new Map(configs.map((c) => [c.provider, c]));
  return PaymentGatewayKeys.map((key) => {
    const existing = byKey.get(key);
    return {
      provider: key,
      mode: existing?.mode ?? "SANDBOX",
      enabled: existing?.enabled ?? false,
      autoVerify: existing?.autoVerify ?? true,
      configured: !!existing,
      updatedAt: existing?.updatedAt.toISOString() ?? null,
    };
  });
}

/** Used by routes/payments.routes.ts before calling confirmGatewayDeposit — see PaymentGatewayConfig.autoVerify. */
export async function getGatewayAutoVerify(provider: PaymentGatewayKey): Promise<boolean> {
  const config = await prisma.paymentGatewayConfig.findUnique({ where: { provider } });
  return config?.autoVerify ?? true;
}

/** Public list for the frontend deposit form — just which gateways are live and clickable. */
export async function listEnabledGatewayKeys(): Promise<PaymentGatewayKey[]> {
  const configs = await prisma.paymentGatewayConfig.findMany({ where: { enabled: true }, select: { provider: true } });
  return configs.map((c) => c.provider as PaymentGatewayKey);
}

export async function upsertGatewayConfig(provider: PaymentGatewayKey, input: UpdateGatewayConfigInput) {
  // Re-validated here even though the route already validates the request
  // body — this is the credential shape actually persisted, worth a second
  // guarantee that we never write malformed/partial gateway credentials.
  // Picked per-provider since each gateway's credential shape differs
  // (bKash: app key/secret/username/password; ZiniPay: a single API key).
  const credentials = gatewayCredentialsSchemas[provider].parse(input.credentials);
  await prisma.paymentGatewayConfig.upsert({
    where: { provider },
    create: {
      provider,
      mode: input.mode,
      enabled: input.enabled,
      autoVerify: input.autoVerify,
      credentialsCiphertext: encrypt(JSON.stringify(credentials)),
    },
    update: {
      mode: input.mode,
      enabled: input.enabled,
      autoVerify: input.autoVerify,
      credentialsCiphertext: encrypt(JSON.stringify(credentials)),
    },
  });
}

/** Loads and decrypts credentials for an enabled gateway — throws if disabled/unconfigured so callers never silently proceed with no credentials. */
export async function getEnabledGatewayCredentials<T>(provider: PaymentGatewayKey): Promise<T> {
  const config = await prisma.paymentGatewayConfig.findUnique({ where: { provider } });
  if (!config || !config.enabled) {
    throw AppError.badRequest(`${provider} is not enabled`);
  }
  return JSON.parse(decrypt(config.credentialsCiphertext)) as T;
}
