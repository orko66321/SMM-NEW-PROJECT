import { Link } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext.js";
import InfoPageShell from "../../components/public/InfoPageShell.js";

export default function About() {
  const { t } = useLanguage();
  return (
    <InfoPageShell title={t("pages.about.title")} subtitle={t("pages.about.subtitle")}>
      <h2>Who we are</h2>
      <p>
        All In One Service is a social media marketing (SMM) reseller panel built for agencies,
        freelancers and high-volume resellers. We connect you to a wide catalogue of engagement
        services across every major platform through a single dashboard and a single wallet.
      </p>

      <h2>What we do</h2>
      <p>
        We aggregate supply from vetted upstream providers and expose it as clean, documented
        services with live pricing. Orders are placed and tracked automatically, deposits are
        verified instantly through local payment methods, and everything the dashboard can do is
        also available over our <Link to="/api-docs">REST API</Link>.
      </p>

      <h2>Why resellers choose us</h2>
      <ul>
        <li><strong>Instant, automated delivery</strong> — orders start the moment a payment clears.</li>
        <li><strong>Transparent pricing</strong> — real per-1,000 rates, no hidden fees or bait minimums.</li>
        <li><strong>Local payments</strong> — bKash, Nagad, Rocket and USDT, verified automatically.</li>
        <li><strong>Real support</strong> — ticketing and live chat wired directly into the panel.</li>
      </ul>

      <h2>Get in touch</h2>
      <p>
        Questions before you sign up? Visit our <Link to="/contact">Contact &amp; Support</Link> page or
        read the <Link to="/faq">FAQ</Link>.
      </p>
    </InfoPageShell>
  );
}
