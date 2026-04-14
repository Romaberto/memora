import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Memora",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-[rgb(var(--muted))]">Last updated: April 12, 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-[rgb(var(--muted))]">
        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">1. Who we are</h2>
          <p>
            Memora (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;) operates the Memora web application (the &quot;Service&quot;).
            This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you use the Service. By using the Service, you consent to the practices described in this Privacy Policy and our <a href="/terms" className="underline hover:text-[rgb(var(--foreground))]">Terms of Service</a>.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">2. Information we collect</h2>
          <p><strong>Account information.</strong> When you register, we collect your name and email address. If you use password-based login, we store a securely hashed version of your password (we never store plaintext passwords). If you sign in via Google OAuth, we receive your Google profile name, verified email address, and Google account identifier.</p>
          <p><strong>Content you provide.</strong> Text you paste into the quiz generator (notes, transcripts, summaries) is transmitted to a third-party AI model provider (currently OpenAI) solely to generate quiz questions. The generated quiz, your answers, scores, and session data are stored in our database to provide your quiz history and dashboard.</p>
          <p><strong>Usage and log data.</strong> We automatically collect standard server logs, which may include IP address, browser type and version, operating system, referring URL, pages visited, timestamps, and request metadata. We also collect quiz-related analytics (scores, streaks, completion times, question counts) to operate and improve the Service.</p>
          <p><strong>Contact requests.</strong> If you use our contact form, we store the name, email address, and message you submit.</p>
          <p><strong>Payment information.</strong> If you subscribe to a paid plan, payment is processed by a third-party payment processor. We do not store full credit card numbers, CVV codes, or bank account details. We may receive and store limited billing information such as the last four digits of your card, card brand, billing address, and transaction identifiers.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">3. Legal basis for processing (EEA/UK users)</h2>
          <p>If you are located in the European Economic Area (EEA) or the United Kingdom, we process your personal data under the following legal bases:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Contract performance</strong> : processing necessary to provide the Service you signed up for (account creation, quiz generation, progress tracking).</li>
            <li><strong>Legitimate interests</strong> : processing for security, abuse prevention, rate limiting, analytics to improve the Service, and communication regarding your account. Our legitimate interests do not override your fundamental rights and freedoms.</li>
            <li><strong>Consent</strong> : where required, such as when you voluntarily submit a contact-form inquiry. You may withdraw consent at any time.</li>
            <li><strong>Legal obligation</strong> : processing necessary to comply with applicable laws (e.g., tax record-keeping for paid subscriptions).</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">4. How we use your information</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>To provide, operate, maintain, and improve the Service.</li>
            <li>To generate quizzes from the text you provide.</li>
            <li>To display your scores, progress, leaderboard rankings, and dashboard.</li>
            <li>To process payments and manage subscriptions.</li>
            <li>To send transactional communications (account verification, password resets, billing receipts, service notifications).</li>
            <li>To respond to contact-form inquiries and support requests.</li>
            <li>To detect, prevent, and address fraud, abuse, security incidents, and technical issues.</li>
            <li>To enforce our Terms of Service.</li>
            <li>To comply with applicable legal obligations.</li>
          </ul>
          <p>We do not use your personal information for automated profiling that produces legal or similarly significant effects. Quiz difficulty or content ordering within the Service is based on general algorithms, not on profiling of individual users.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">5. Third-party services and data sharing</h2>
          <p>We share personal data with third-party service providers only as necessary to operate the Service:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>OpenAI</strong> : your submitted text is transmitted to OpenAI&apos;s API to generate quiz questions. OpenAI processes this data under its <a href="https://openai.com/policies/usage-policies" className="underline hover:text-[rgb(var(--foreground))]" target="_blank" rel="noopener noreferrer">usage policies</a> and <a href="https://openai.com/policies/api-data-usage-policies" className="underline hover:text-[rgb(var(--foreground))]" target="_blank" rel="noopener noreferrer">API data usage policy</a>. As of this writing, OpenAI does not use API inputs/outputs for training.</li>
            <li><strong>Vercel</strong> : application hosting and serverless compute (United States).</li>
            <li><strong>Neon</strong> : managed PostgreSQL database (United States).</li>
            <li><strong>Upstash</strong> : Redis-based rate limiting (may include US and EU regions).</li>
            <li><strong>Google</strong> : if you use Google sign-in, your authentication is facilitated through Google OAuth.</li>
          </ul>
          <p><strong>We do not sell, rent, or share your personal information with third parties for their advertising or marketing purposes.</strong></p>
          <p>We may also disclose your information if required to do so by law, subpoena, court order, or other legal process, or if we believe in good faith that disclosure is necessary to protect our rights, protect your safety or the safety of others, investigate fraud, or respond to a government request.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">6. International data transfers</h2>
          <p>Your personal data may be transferred to and processed in countries other than your country of residence, including the United States, where our hosting providers and third-party services operate. These countries may have data protection laws that differ from the laws of your jurisdiction.</p>
          <p>Where required by applicable law (such as the GDPR), we rely on appropriate safeguards for international transfers, including the European Commission&apos;s Standard Contractual Clauses (SCCs), adequacy decisions, or the data importer&apos;s binding commitments. By using the Service, you consent to the transfer of your data to the United States and other countries as described herein.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">7. Data retention</h2>
          <p>We retain your account data and quiz history for as long as your account is active or as needed to provide the Service. If you request deletion of your account, we will delete or anonymize your personal data within 30 days, except where we are required by law to retain it (e.g., billing records for tax purposes, which may be retained for up to 7 years).</p>
          <p>Contact-form submissions are retained for up to 2 years to allow us to follow up on inquiries, after which they are deleted.</p>
          <p>Server logs containing IP addresses are retained for up to 90 days for security and debugging purposes.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">8. Security</h2>
          <p>We implement industry-standard technical and organizational measures to protect your personal data, including: encrypted connections (TLS/HTTPS), bcrypt-hashed passwords, HTTP-only secure session cookies, database access controls, environment-variable-based secrets management, and IP-based rate limiting.</p>
          <p>However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your personal data, we cannot guarantee its absolute security and shall not be liable for any unauthorized access, disclosure, or loss that occurs despite our reasonable security measures.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">9. Data breach notification</h2>
          <p>In the event of a personal data breach that is likely to result in a risk to your rights and freedoms, we will notify affected users without undue delay and, where required by applicable law (including GDPR Article 33), notify the relevant supervisory authority within 72 hours of becoming aware of the breach. Notification will include the nature of the breach, the categories of data affected, and the measures taken or proposed to address it.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">10. Cookies</h2>
          <p>We use a small number of essential cookies strictly necessary for the Service to function:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Session cookie</strong> (<code>memorize.session</code>): authenticates your login session (HTTP-only, secure, SameSite=Lax, 30-day expiry).</li>
            <li><strong>OAuth state/PKCE cookies</strong> : short-lived (5 minutes), used only during the Google sign-in redirect flow, then automatically deleted.</li>
          </ul>
          <p>We do not use tracking cookies, advertising cookies, analytics cookies, or any third-party cookies. Because we use only strictly necessary cookies, consent banners are not required under the ePrivacy Directive.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">11. Your rights</h2>
          <p>Depending on your jurisdiction, you may have the following rights regarding your personal data:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Access</strong> : request a copy of the personal data we hold about you.</li>
            <li><strong>Rectification</strong> : request correction of inaccurate or incomplete personal data.</li>
            <li><strong>Erasure (&quot;right to be forgotten&quot;)</strong> : request deletion of your personal data, subject to legal retention requirements.</li>
            <li><strong>Restriction</strong> : request that we limit the processing of your personal data under certain circumstances.</li>
            <li><strong>Data portability</strong> : request a machine-readable copy of the personal data you provided to us.</li>
            <li><strong>Objection</strong> : object to processing based on our legitimate interests.</li>
            <li><strong>Withdraw consent</strong> : where processing is based on consent, you may withdraw it at any time without affecting the lawfulness of prior processing.</li>
          </ul>
          <p><strong>How to exercise your rights:</strong> Contact us via our <a href="/contact" className="underline hover:text-[rgb(var(--foreground))]">contact form</a>. We will respond to your request within 30 days (or within the time period required by applicable law). We may request verification of your identity before processing your request.</p>
          <p><strong>Right to lodge a complaint:</strong> If you are in the EEA or UK, you have the right to lodge a complaint with your local data protection supervisory authority.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">12. California residents (CCPA/CPRA)</h2>
          <p>If you are a California resident, the California Consumer Privacy Act (CCPA), as amended by the California Privacy Rights Act (CPRA), grants you additional rights:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Right to know</strong> : you may request the categories and specific pieces of personal information we have collected about you.</li>
            <li><strong>Right to delete</strong> : you may request deletion of your personal information, subject to certain exceptions.</li>
            <li><strong>Right to opt out of sale/sharing</strong> : <strong>we do not sell or share your personal information</strong> as defined under the CCPA/CPRA.</li>
            <li><strong>Non-discrimination</strong> : we will not discriminate against you for exercising your rights.</li>
          </ul>
          <p>To exercise your CCPA rights, contact us via the <a href="/contact" className="underline hover:text-[rgb(var(--foreground))]">contact form</a>.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">13. Children</h2>
          <p>The Service is not directed to children under 16. We do not knowingly collect personal information from children under 16. If you are a parent or guardian and believe your child has provided us with personal data, please contact us immediately so we can take steps to remove that information and terminate the child&apos;s account.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">14. Automated decision-making</h2>
          <p>The Service uses AI models to generate quiz content based on the text you provide. This is a content-generation feature, not an automated decision-making process that produces legal or similarly significant effects on you. Quiz scores, streaks, and leaderboard rankings are calculated by deterministic algorithms based on your quiz answers and do not involve profiling.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">15. Changes to this policy</h2>
          <p>We may update this Privacy Policy from time to time. If we make material changes, we will notify you by posting a prominent notice on the Service and updating the &quot;Last updated&quot; date above. For material changes that affect how we use data you have already provided, we will make reasonable efforts to notify you via the email address associated with your account at least 14 days before the changes take effect. Your continued use of the Service after the revised Privacy Policy becomes effective constitutes your acceptance of the updated policy.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">16. Contact</h2>
          <p>If you have questions or concerns about this Privacy Policy or our data practices, please reach out via our <a href="/contact" className="underline hover:text-[rgb(var(--foreground))]">contact form</a>.</p>
        </section>
      </div>
    </div>
  );
}
