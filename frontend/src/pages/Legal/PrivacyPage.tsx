import styles from './LegalPage.module.scss';

export function PrivacyPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.lastUpdated}>Last updated: 30 April 2026</p>

        <section className={styles.section}>
          <h2>1. Data Controller</h2>
          <p>
            RigBuilder ("we", "us", "our") is the data controller for personal data collected through this Platform.
            For any privacy-related enquiries, you can contact our Data Protection Officer (DPO) at{' '}
            <a href="mailto:privacy@rigbuilder.com">privacy@rigbuilder.com</a>.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Data We Collect</h2>
          <p>We collect the following categories of personal data:</p>
          <ul>
            <li><strong>Account data:</strong> username, email address, hashed password.</li>
            <li><strong>Profile data:</strong> avatar, bio, location, Discord username (where you choose to provide these).</li>
            <li><strong>Activity data:</strong> forum posts, marketplace listings, build configurations, reviews, and interactions with other users.</li>
            <li><strong>Technical data:</strong> session tokens, IP addresses (for rate limiting), and browser type.</li>
            <li><strong>Communication data:</strong> messages sent between users on the Platform.</li>
            <li><strong>Preference data:</strong> notification preferences, email digest settings, and interest categories.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>3. Legal Basis for Processing</h2>
          <p>We process your personal data under the following lawful bases (UK GDPR Article 6):</p>
          <ul>
            <li><strong>Contract performance (Art. 6(1)(b)):</strong> to provide and maintain your account and the services you request.</li>
            <li><strong>Legitimate interests (Art. 6(1)(f)):</strong> to improve the Platform, detect fraud, enforce our terms, and send service-related communications.</li>
            <li><strong>Consent (Art. 6(1)(a)):</strong> for optional features such as email digest emails and non-essential cookies. You may withdraw consent at any time.</li>
            <li><strong>Legal obligation (Art. 6(1)(c)):</strong> where required by applicable law.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>4. How We Use Your Data</h2>
          <p>We use your personal data to:</p>
          <ul>
            <li>Create and manage your account.</li>
            <li>Provide and improve the Platform's features.</li>
            <li>Send transactional emails (email verification, password reset, marketplace notifications).</li>
            <li>Send digest emails where you have opted in.</li>
            <li>Moderate content and enforce our Terms of Service.</li>
            <li>Comply with legal obligations.</li>
          </ul>
          <p>We do not sell your personal data to third parties.</p>
        </section>

        <section className={styles.section}>
          <h2>5. Data Sharing</h2>
          <p>We may share your data with:</p>
          <ul>
            <li><strong>Service providers:</strong> hosting, database, and email delivery providers acting as data processors under appropriate data processing agreements.</li>
            <li><strong>Law enforcement:</strong> where required by law or to protect the rights, property, or safety of RigBuilder, our users, or the public.</li>
          </ul>
          <p>Your public profile information (username, avatar, public listings, forum posts) is visible to all Platform users.</p>
        </section>

        <section className={styles.section}>
          <h2>6. Data Retention</h2>
          <p>
            We retain your personal data for as long as your account is active, or as needed to provide services.
            If you delete your account, we will delete your personal data within 30 days, except where retention is
            required for legal obligations or legitimate interests (e.g., records of completed transactions for
            fraud prevention). Anonymised or aggregated data may be retained indefinitely.
          </p>
        </section>

        <section className={styles.section}>
          <h2>7. Your Rights</h2>
          <p>Under UK GDPR, you have the following rights:</p>
          <ul>
            <li><strong>Right of access:</strong> request a copy of the personal data we hold about you.</li>
            <li><strong>Right to rectification:</strong> request correction of inaccurate data.</li>
            <li><strong>Right to erasure ("right to be forgotten"):</strong> request deletion of your personal data. You can delete your account at any time via Settings.</li>
            <li><strong>Right to data portability:</strong> receive your data in a structured, machine-readable format.</li>
            <li><strong>Right to restriction:</strong> request that we restrict processing of your data in certain circumstances.</li>
            <li><strong>Right to object:</strong> object to processing based on legitimate interests.</li>
            <li><strong>Right to withdraw consent:</strong> where processing is based on consent, you may withdraw at any time without affecting the lawfulness of prior processing.</li>
          </ul>
          <p>
            To exercise any of these rights, contact us at{' '}
            <a href="mailto:privacy@rigbuilder.com">privacy@rigbuilder.com</a>. We will respond within one month.
            If you are unhappy with our response, you have the right to lodge a complaint with the{' '}
            <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">Information Commissioner's Office (ICO)</a>.
          </p>
        </section>

        <section className={styles.section}>
          <h2>8. Cookies</h2>
          <p>We use the following types of cookies:</p>
          <ul>
            <li><strong>Essential cookies:</strong> required for the Platform to function (e.g., session cookies for authentication). These cannot be disabled.</li>
            <li><strong>Analytics cookies:</strong> help us understand how users interact with the Platform. These are only set with your consent.</li>
          </ul>
          <p>
            You can manage your cookie preferences at any time using the cookie banner or via your browser settings.
          </p>
        </section>

        <section className={styles.section}>
          <h2>9. Children's Privacy</h2>
          <p>
            The Platform is not intended for children under the age of 13. We do not knowingly collect personal data
            from children under 13. If we become aware that we have collected data from a child under 13, we will
            delete it promptly. Please contact us if you believe we have inadvertently collected such data.
          </p>
        </section>

        <section className={styles.section}>
          <h2>10. International Transfers</h2>
          <p>
            Your data is processed primarily in the United Kingdom. Where data is transferred outside the UK, we
            ensure appropriate safeguards are in place in accordance with UK GDPR requirements.
          </p>
        </section>

        <section className={styles.section}>
          <h2>11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of significant changes by email
            or by posting a notice on the Platform. The "last updated" date at the top of this page reflects the
            most recent revision.
          </p>
        </section>

        <section className={styles.section}>
          <h2>12. Contact</h2>
          <p>
            For any privacy-related questions or to exercise your rights, contact our DPO at{' '}
            <a href="mailto:privacy@rigbuilder.com">privacy@rigbuilder.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}

export default PrivacyPage;
