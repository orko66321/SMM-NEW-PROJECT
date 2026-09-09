import { Link } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext.js";
import InfoPageShell from "../../components/public/InfoPageShell.js";
import { SITE_POLICY_UPDATED } from "./sitePolicyMeta.js";

export default function Privacy() {
  const { t } = useLanguage();
  return (
    <InfoPageShell
      title={t("pages.privacy.title")}
      subtitle={t("pages.privacy.subtitle")}
      updated={t("pages.policyUpdated", { date: SITE_POLICY_UPDATED })}
    >
      <h2>What we collect</h2>
      <ul>
        <li><strong>Account data</strong> — username, email, password hash, and an API key.</li>
        <li><strong>Order data</strong> — the services, links and quantities you submit, plus status and timing.</li>
        <li><strong>Payment data</strong> — deposit amounts, method and gateway reference. Card and mobile-wallet credentials are handled by the payment provider, not stored by us.</li>
        <li><strong>Technical data</strong> — IP address, browser, and basic logs needed to run and secure the service.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To operate your account, process orders and verify deposits.</li>
        <li>To provide support and respond to tickets.</li>
        <li>To detect fraud and abuse and to keep the panel secure.</li>
        <li>To meet legal and accounting obligations.</li>
      </ul>
      <p>We do not sell your personal data.</p>

      <h2>Sharing</h2>
      <p>
        The link and quantity for an order are sent to the upstream provider that fulfils it. Payment
        details are shared with the payment gateway you choose. We may disclose information where
        required by law or to protect the panel and its users.
      </p>

      <h2>Retention</h2>
      <p>
        Account and transaction records are kept while your account is active and for as long as
        needed afterwards for legal, tax and dispute-resolution purposes, then deleted or anonymised.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>You can update your profile and regenerate your API key from your dashboard.</li>
        <li>You can request account deletion via <Link to="/contact">support</Link>; some records are retained where the law requires.</li>
      </ul>

      <h2>Cookies and local storage</h2>
      <p>
        We use a session cookie to keep you signed in and browser storage for preferences such as
        language and currency. We do not use third-party advertising trackers.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy questions or requests: see <Link to="/contact">Contact &amp; Support</Link>.
      </p>
    </InfoPageShell>
  );
}
