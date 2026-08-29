# Password reset email setup

There are two ways to send: **Brevo over HTTPS** (recommended when the API runs
on Railway) or **SMTP** (configured from the admin panel).

If neither is configured, the app does not fail — password reset links are just
written to the API server logs instead of emailed. Fine for local dev, but real
users can't reset their password until one of the two is set up.

## Recommended: Brevo over HTTPS (works from Railway)

A cPanel / shared-hosting mail server is very often **unreachable from a cloud
host like Railway** — the SMTP ports (465/587) simply time out at a firewall,
even though the same server works fine from a normal internet connection. An
HTTPS API call on port 443 always gets through, so on Railway use Brevo's API
instead of SMTP:

1. Create a free account at [brevo.com](https://www.brevo.com) (300 emails/day
   free).
2. **Senders, Domains & Dedicated IPs → Senders** → add your from-address
   (e.g. `noreplay@allinonsr.com`) and verify it (open that mailbox in cPanel
   and click the confirmation link).
3. **SMTP & API → API Keys** (or the **SMTP** tab) → generate a key.
4. On the **Railway API service → Variables**, set:
   - `BREVO_API_KEY` = the key from step 3
   - `MAIL_FROM` = the verified sender address from step 2
   - `FRONTEND_BASE_URL` = `https://allinonsr.com`
5. Redeploy (Railway does this automatically when you change variables).
6. In the admin panel, **/admin/settings → SMTP card → "Send test email"** —
   you don't need to fill in the SMTP fields at all; the Brevo key takes
   priority. Confirm you receive "SMTP test — `<site name>`".

When `BREVO_API_KEY` is set it is used for every email and the SMTP settings
below are ignored.

## Alternative: SMTP from the admin panel

Only works if the API host can actually reach your mail server on the SMTP port
(true for local dev and for hosts on the same network as the mailbox; usually
**not** true for Railway → cPanel). Configured entirely from
**/admin/settings → SMTP (password reset emails)** — no environment variable,
no redeploy.

### A mailbox on your own domain

The simplest, most reliable option is a real mailbox on the site's own domain,
created through cPanel:

1. cPanel → **Email Accounts** → Create, e.g. `noreply@allinonsr.com`.
2. In the admin panel, fill in:
   - **Host**: `mail.<yourdomain>` (e.g. `mail.allinonsr.com`)
   - **Port**: `465`
   - **Username**: the full address, e.g. `noreply@allinonsr.com`
   - **Password**: the mailbox password
   - **From address**: the same address, e.g. `noreply@allinonsr.com`
3. Tick **Enable SMTP sending** and save.

Because the mailbox lives on your own domain, SPF and DKIM are already set up
by cPanel — you get good deliverability without touching DNS yourself.

## Alternatives

| Provider | Host : Port | Username | Password | Notes |
| --- | --- | --- | --- | --- |
| Gmail | `smtp.gmail.com` : `587` | your Gmail address | an [App Password](https://myaccount.google.com/apppasswords), **not** your normal password | Requires 2-Step Verification on the Google account first. ~500/day. |
| Brevo (formerly Sendinblue) | `smtp-relay.brevo.com` : `587` | your Brevo account email | your **SMTP key** from Brevo's SMTP & API settings, **not** your account password | Free tier: 300 emails/day. |

### Port 465 vs 587

- **465** = SSL (implicit TLS) — the connection is encrypted from the start.
- **587** = STARTTLS — the connection starts plain and upgrades to TLS.

The mailer treats port `465` as SSL and anything else as STARTTLS, and relaxes
TLS certificate verification (shared-hosting certs usually don't match the
`mail.<domain>` hostname). Use whichever port your provider tells you to.

## Environment variables (Railway API service)

- **`FRONTEND_BASE_URL`** must be `https://allinonsr.com` — not `localhost` or a
  Railway internal URL. The reset link is built as
  `${FRONTEND_BASE_URL}/reset-password?token=...`, so if this is wrong the email
  sends fine but the link inside it is broken.
- **`BREVO_API_KEY`** / **`MAIL_FROM`** — set both to send via Brevo over HTTPS
  (see the top of this doc). Leave blank to use the admin-panel SMTP settings.
- **`ENCRYPTION_KEY`** — encrypts the SMTP password at rest in Postgres. Already
  set if payment gateways are configured.

## Verifying it works

1. Configure Brevo (env vars) **or** SMTP (admin panel), as above.
2. **/admin/settings → "Send test email"**, enter an address you can check, and
   confirm you receive "SMTP test — `<site name>`".
3. If it fails, the toast shows the raw error — for Brevo, e.g.
   `Brevo API error 401` (bad key) or `...unrecognised sender` (sender not
   verified); for SMTP, e.g. "authentication failed" or a connection timeout
   (the SMTP port is blocked — switch to Brevo). The same detail is in the
   Railway logs for the API service.
4. Once the test succeeds, do a real end-to-end check with **/forgot-password**.
