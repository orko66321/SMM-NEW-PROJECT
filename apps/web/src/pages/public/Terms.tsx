import { Link } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext.js";
import InfoPageShell from "../../components/public/InfoPageShell.js";
import { SITE_POLICY_UPDATED } from "./sitePolicyMeta.js";

export default function Terms() {
  const { t } = useLanguage();
  return (
    <InfoPageShell
      title={t("pages.terms.title")}
      subtitle={t("pages.terms.subtitle")}
      updated={t("pages.policyUpdated", { date: SITE_POLICY_UPDATED })}
    >
      <h2>1. Acceptance</h2>
      <p>
        By creating an account or placing an order on All In One Service (&ldquo;the panel&rdquo;) you
        agree to these Terms of Service and to our <Link to="/privacy">Privacy Policy</Link>. If you do
        not agree, do not use the panel.
      </p>

      <h2>2. Accounts</h2>
      <ul>
        <li>You must provide accurate registration details and keep your credentials and API key secret.</li>
        <li>You are responsible for all activity under your account, including API usage.</li>
        <li>One person or business per account unless we agree otherwise in writing.</li>
      </ul>

      <h2>3. Services and orders</h2>
      <p>
        Services are resold from third-party providers. The charge for an order is always calculated
        server-side from the live service rate at the moment of purchase. Delivery speed, quality and
        availability depend on the upstream provider and are not guaranteed to a fixed timeline.
      </p>

      <h2>4. Payments, wallet and refunds</h2>
      <ul>
        <li>Funds added to your wallet are used to pay for orders and are non-transferable between accounts.</li>
        <li>If an order cannot be delivered by the provider it is marked failed and the charge is refunded to your wallet automatically.</li>
        <li>Partial delivery may be refunded pro-rata where the provider reports a partial result.</li>
        <li>Wallet balance is generally non-withdrawable; contact support for exceptional cases.</li>
        <li>Chargebacks or payment disputes filed without first contacting support may result in account suspension.</li>
      </ul>

      <h2>5. Acceptable use</h2>
      <p>You agree not to use the panel to:</p>
      <ul>
        <li>target accounts, content or people without authorisation, or violate any platform&rsquo;s own terms in a way that creates liability for us;</li>
        <li>place orders for illegal content, harassment, fraud, or manipulation of elections or markets;</li>
        <li>resell access in a way that misrepresents the source or reliability of the services;</li>
        <li>attack, overload or reverse-engineer the panel or its API.</li>
      </ul>

      <h2>6. Service changes and availability</h2>
      <p>
        We may add, remove, re-price or disable services at any time as upstream supply changes. We
        aim for high uptime but do not guarantee uninterrupted availability.
      </p>

      <h2>7. Suspension and termination</h2>
      <p>
        We may suspend or close an account that breaches these terms, abuses payment methods, or
        creates risk for the panel or other users. Remaining wallet balance may be forfeited in cases
        of fraud or serious abuse.
      </p>

      <h2>8. Liability</h2>
      <p>
        The panel is provided &ldquo;as is&rdquo;. To the extent permitted by law, our total liability
        for any claim relating to the service is limited to the amount you paid us for the order
        giving rise to the claim.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions about these terms: see <Link to="/contact">Contact &amp; Support</Link>.
      </p>
    </InfoPageShell>
  );
}
