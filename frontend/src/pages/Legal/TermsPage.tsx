import styles from './LegalPage.module.scss';

export function TermsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Terms of Service</h1>
        <p className={styles.lastUpdated}>Last updated: 30 April 2026</p>

        <section className={styles.section}>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using RigBuilder ("the Platform"), you agree to be bound by these Terms of Service. If you
            do not agree, please do not use the Platform. These terms apply to all visitors, users, and others who
            access or use the service.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. User Accounts</h2>
          <p>
            To access certain features, you must register for an account. You are responsible for maintaining the
            confidentiality of your login credentials and for all activity that occurs under your account. You must
            provide accurate and complete information when registering. You must be at least 13 years of age to use
            the Platform.
          </p>
          <p>
            You may not transfer your account to another person. If you suspect unauthorised access to your account,
            notify us immediately at legal@rigbuilder.com.
          </p>
        </section>

        <section className={styles.section}>
          <h2>3. Marketplace Rules</h2>
          <p>
            RigBuilder operates a peer-to-peer marketplace for sim racing hardware. When listing items, you must:
          </p>
          <ul>
            <li>Be the lawful owner of, or have the right to sell, the item listed.</li>
            <li>Provide accurate descriptions, pricing, and condition information.</li>
            <li>Honour transactions you agree to, including responding to buyers in a timely manner.</li>
            <li>Not misrepresent the condition, authenticity, or specifications of any item.</li>
          </ul>
          <p>
            RigBuilder is not a party to any transaction between buyers and sellers. We are not responsible for the
            quality, safety, or legality of items listed.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. Prohibited Content</h2>
          <p>You agree not to post, transmit, or otherwise make available any content that:</p>
          <ul>
            <li>Is unlawful, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable.</li>
            <li>Infringes any intellectual property rights of any third party.</li>
            <li>Contains spam, unsolicited advertising, or phishing material.</li>
            <li>Impersonates any person or entity.</li>
            <li>Interferes with or disrupts the Platform or servers connected to it.</li>
          </ul>
          <p>
            We reserve the right to remove any content that violates these terms and to suspend or terminate accounts
            without prior notice.
          </p>
        </section>

        <section className={styles.section}>
          <h2>5. Intellectual Property</h2>
          <p>
            The Platform and its original content (excluding user-generated content) are owned by RigBuilder and are
            protected by copyright, trademark, and other intellectual property laws. You retain ownership of any
            content you submit; however, by submitting content, you grant RigBuilder a worldwide, non-exclusive,
            royalty-free licence to use, reproduce, and display it for the purpose of operating the Platform.
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. Disclaimers</h2>
          <p>
            The Platform is provided on an "as is" and "as available" basis without warranties of any kind, either
            express or implied. RigBuilder does not warrant that the service will be uninterrupted, error-free, or
            free of viruses or other harmful components.
          </p>
        </section>

        <section className={styles.section}>
          <h2>7. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by applicable law, RigBuilder shall not be liable for any indirect,
            incidental, special, consequential, or punitive damages arising out of or related to your use of the
            Platform, even if advised of the possibility of such damages. Our aggregate liability to you for any
            claims arising out of these terms shall not exceed £100.
          </p>
        </section>

        <section className={styles.section}>
          <h2>8. Termination</h2>
          <p>
            We may terminate or suspend your account at any time, with or without cause, with or without notice.
            Upon termination, your right to use the Platform will immediately cease. You may delete your account at
            any time via Settings &rarr; Delete Account.
          </p>
        </section>

        <section className={styles.section}>
          <h2>9. Governing Law</h2>
          <p>
            These terms shall be governed by and construed in accordance with the laws of England and Wales. Any
            disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.
          </p>
        </section>

        <section className={styles.section}>
          <h2>10. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. We will provide notice of significant changes
            via email or a prominent notice on the Platform. Continued use after changes constitutes acceptance of
            the revised terms.
          </p>
        </section>

        <section className={styles.section}>
          <h2>11. Contact</h2>
          <p>
            For questions about these Terms of Service, please contact us at{' '}
            <a href="mailto:legal@rigbuilder.com">legal@rigbuilder.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}

export default TermsPage;
