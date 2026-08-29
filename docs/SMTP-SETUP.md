# SMTP setup (password reset emails)

SMTP is configured entirely from the admin panel — there is no environment
variable to set and no redeploy needed. Go to **/admin/settings → SMTP
(password reset emails)**, fill in the fields, and save.

If SMTP is left disabled, or any required field is missing, the app does not
fail — password reset links are just written to the API server logs (Railway)
instead of emailed. That is fine for local development, but it means real users
cannot reset their password until SMTP is fully configured.

## Recommended: a mailbox on your own domain

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

## Port 465 vs 587

- **465** = SSL (implicit TLS) — the connection is encrypted from the start.
- **587** = STARTTLS — the connection starts plain and upgrades to TLS.

The mailer only looks at the port number to decide: it treats port `465` as SSL
and anything else as STARTTLS. Use whichever port your provider tells you to,
and leave the rest to the app.

## Required Railway environment variables

SMTP credentials are admin-configured (above), but two variables on the
**Railway API service** still have to be correct for reset emails to work
end to end:

- **`FRONTEND_BASE_URL`** must be `https://allinonsr.com` — not `localhost` or a
  Railway internal URL. The reset link in the email is built as
  `${FRONTEND_BASE_URL}/reset-password?token=...`, so if this is wrong the email
  sends fine but the link inside it is broken.
- **`ENCRYPTION_KEY`** must be set. It encrypts the SMTP password (and payment
  gateway credentials) at rest in Postgres. If payment gateways are already
  configured on this instance, it is already set.

## Verifying it works

1. Save your SMTP settings at **/admin/settings**.
2. Click **Send test email**, enter an address you can check, and confirm you
   receive "SMTP test — `<site name>`".
3. If the test fails, the toast shows the raw error from the mail server
   (e.g. "authentication failed", "self-signed certificate") — fix the setting
   it points at and try again. The same error is in the Railway logs for the
   API service.
4. Once the test succeeds, do a real end-to-end check with **/forgot-password**
   using a real account's email or username.
