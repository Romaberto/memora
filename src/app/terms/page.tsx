import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Memora",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-[rgb(var(--muted))]">Last updated: April 12, 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-[rgb(var(--muted))]">
        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">1. Acceptance of terms</h2>
          <p>
            By creating an account, accessing, or using the Memora web application (the &quot;Service&quot;), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service (&quot;Terms&quot;) and our <a href="/privacy" className="underline hover:text-[rgb(var(--foreground))]">Privacy Policy</a>, which is incorporated herein by reference.
            If you do not agree to all of these Terms, you must not use the Service.
          </p>
          <p>We reserve the right to modify these Terms at any time by posting the updated version on the Service with a revised &quot;Last updated&quot; date. Changes become effective immediately upon posting. Your continued use of the Service after any modification constitutes your binding acceptance of the revised Terms. It is your responsibility to review the Terms periodically.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">2. Description of service</h2>
          <p>
            Memora is an AI-powered learning tool that generates multiple-choice quizzes from user-provided text.
            The Service includes a free tier and may include paid subscription plans (&quot;Pro&quot;) with additional features or higher usage limits.
          </p>
          <p>We reserve the right to modify, suspend, or discontinue any part of the Service (including features, usage limits, or pricing) at any time, with or without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuation of the Service.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">3. Eligibility</h2>
          <p>You must be at least 16 years of age to use the Service. By using the Service, you represent and warrant that you are at least 16 years old and have the legal capacity to enter into these Terms. If you are under 18, you represent that a parent or legal guardian has reviewed and agreed to these Terms on your behalf.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">4. Accounts</h2>
          <p>You must register for an account to use the Service. You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account, whether or not you authorized it. You agree to provide accurate and complete information during registration and to keep it up to date.</p>
          <p>You must notify us immediately of any unauthorized use of your account. We shall not be liable for any loss or damage arising from your failure to protect your account credentials.</p>
          <p>We reserve the right to suspend or terminate accounts that violate these Terms, that we reasonably believe are being used fraudulently, or that have been inactive for more than 12 months.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">5. Free and paid plans</h2>
          <p><strong>Free tier.</strong> The free tier allows a limited number of quizzes per day. We may adjust these limits at our sole discretion without notice. The free tier is provided without any uptime or availability guarantees.</p>
          <p><strong>Pro subscriptions.</strong> Paid plans are billed on a recurring basis (monthly or annually, as selected at the time of purchase). All prices are in US dollars and exclude applicable taxes, which are your responsibility. Prices may change with at least 30 days&apos; prior notice; if you do not agree to the new price, you may cancel before the next billing cycle.</p>
          <p><strong>Cancellation.</strong> You may cancel your subscription at any time through your account settings. Cancellation takes effect at the end of the current billing period. You will retain access to Pro features until the end of the period you have already paid for.</p>
          <p><strong>Refunds.</strong> Payments are non-refundable except where required by applicable law. If you believe you were charged in error, contact us within 14 days of the charge, and we will investigate in good faith. We may, at our sole discretion, issue partial or full refunds in exceptional circumstances.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">6. User content</h2>
          <p>You retain all ownership rights to the text, notes, and materials you submit to the Service (&quot;User Content&quot;). By submitting User Content, you grant us a worldwide, non-exclusive, royalty-free, sublicensable license to use, process, store, and transmit your User Content solely as necessary to provide and improve the Service (including transmitting it to third-party AI models for quiz generation).</p>
          <p>You represent and warrant that (a) you own or have the necessary rights and permissions to submit your User Content, (b) your User Content does not infringe or violate any intellectual property, privacy, or other rights of any third party, and (c) your User Content does not violate any applicable law.</p>
          <p>We do not monitor or pre-screen User Content but reserve the right to remove any User Content that we believe violates these Terms or that may expose us to liability.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">7. AI-generated content</h2>
          <p>Quizzes, questions, explanations, and other content generated by the Service (&quot;AI Content&quot;) are produced by third-party artificial intelligence models and are provided for educational and informational purposes only. AI Content may contain errors, inaccuracies, or omissions.</p>
          <p><strong>The Service is a study aid and is not a substitute for professional instruction, academic assessment, textbooks, medical advice, legal advice, or any form of expert guidance.</strong> You acknowledge that you use AI Content entirely at your own risk and that we bear no responsibility for any decisions, actions, or outcomes based on AI Content.</p>
          <p>We make no representations or warranties regarding the accuracy, completeness, or reliability of AI Content.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">8. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Use the Service for any unlawful, harmful, or fraudulent purpose.</li>
            <li>Attempt to gain unauthorized access to any part of the Service, other accounts, or the underlying infrastructure.</li>
            <li>Interfere with, disrupt, or place an unreasonable burden on the Service or its servers and networks.</li>
            <li>Use automated scripts, bots, scrapers, or similar means to access the Service beyond normal individual human usage.</li>
            <li>Upload or transmit content that is defamatory, obscene, hateful, threatening, or that violates the rights of others.</li>
            <li>Circumvent or attempt to circumvent usage limits, rate limits, access controls, or security measures.</li>
            <li>Reverse-engineer, decompile, or disassemble any part of the Service.</li>
            <li>Resell, sublicense, or redistribute the Service or any part thereof without our prior written consent.</li>
            <li>Use the Service to develop a competing product or service.</li>
          </ul>
          <p>Violation of this section may result in immediate suspension or termination of your account, at our sole discretion, without notice or refund.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">9. Intellectual property</h2>
          <p>The Service, including its source code, design, user interface, branding, logos, and documentation (excluding User Content and AI Content), is the exclusive property of Memora and is protected by applicable copyright, trademark, and other intellectual property laws. Nothing in these Terms grants you any right, title, or interest in the Service except the limited right to use it as described herein.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">10. Copyright and DMCA</h2>
          <p>We respect intellectual property rights. If you believe that any content on the Service infringes your copyright, please contact us via our <a href="/contact" className="underline hover:text-[rgb(var(--foreground))]">contact form</a> with: (a) a description of the copyrighted work, (b) the URL or location of the allegedly infringing content, (c) your contact information, and (d) a statement that you have a good-faith belief the use is unauthorized. We will investigate and respond in accordance with applicable law.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">11. Disclaimers</h2>
          <p className="uppercase font-medium text-[rgb(var(--foreground))]">
            The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, whether express, implied, statutory, or otherwise. We expressly disclaim all implied warranties, including but not limited to implied warranties of merchantability, fitness for a particular purpose, title, and non-infringement.
          </p>
          <p>Without limiting the foregoing, we do not warrant that: (a) the Service will meet your requirements; (b) the Service will be uninterrupted, timely, secure, or error-free; (c) any data stored in the Service will be accurate, reliable, or not subject to loss; (d) AI Content will be accurate or suitable for any particular purpose; or (e) any defects in the Service will be corrected.</p>
          <p><strong>Data loss.</strong> You acknowledge that we do not guarantee the preservation of any data, including User Content, quiz history, scores, or account information. You are solely responsible for maintaining independent backups of any data that is important to you.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">12. Limitation of liability</h2>
          <p className="uppercase font-medium text-[rgb(var(--foreground))]">
            To the maximum extent permitted by applicable law, in no event shall Memora, its affiliates, directors, officers, employees, agents, or licensors be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, including but not limited to loss of profits, revenue, data, goodwill, or other intangible losses, arising out of or related to your access to, use of, or inability to use the Service, regardless of the theory of liability (contract, tort, strict liability, or otherwise) and even if we have been advised of the possibility of such damages.
          </p>
          <p>Our total aggregate liability for all claims arising out of or related to these Terms or the Service shall not exceed the greater of (a) the total amount you paid to us in the twelve (12) months immediately preceding the event giving rise to the claim, or (b) fifty US dollars ($50).</p>
          <p>Some jurisdictions do not allow the exclusion or limitation of certain damages. In those jurisdictions, our liability shall be limited to the fullest extent permitted by law.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">13. Indemnification</h2>
          <p>You agree to defend, indemnify, and hold harmless Memora and its affiliates, directors, officers, employees, and agents from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys&apos; fees) arising out of or related to: (a) your use of the Service; (b) your User Content; (c) your violation of these Terms; or (d) your violation of any rights of a third party. We reserve the right, at your expense, to assume the exclusive defense and control of any matter subject to indemnification by you.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">14. Dispute resolution and arbitration</h2>
          <p><strong>Informal resolution first.</strong> Before filing any formal legal proceeding, you agree to attempt to resolve any dispute with us informally by sending a written description of your claim to us via the <a href="/contact" className="underline hover:text-[rgb(var(--foreground))]">contact form</a>. We will attempt to resolve the dispute within 60 days. If the dispute is not resolved within that period, either party may proceed as described below.</p>
          <p><strong>Binding arbitration.</strong> Any dispute, claim, or controversy arising out of or relating to these Terms or the Service that is not resolved informally shall be resolved by binding arbitration administered under the rules of a recognized arbitration body in the jurisdiction specified in Section 16. The arbitration shall be conducted by a single arbitrator. The arbitrator&apos;s decision shall be final and binding and may be entered as a judgment in any court of competent jurisdiction.</p>
          <p><strong>Class action waiver.</strong> You and Memora each agree that any proceedings to resolve disputes will be conducted solely on an individual basis and not in a class, consolidated, or representative action. If for any reason a claim proceeds in court rather than in arbitration, you and Memora each waive the right to a jury trial and the right to participate in a class action.</p>
          <p><strong>Exceptions.</strong> Notwithstanding the foregoing, either party may seek injunctive or other equitable relief in any court of competent jurisdiction to prevent the actual or threatened infringement, misappropriation, or violation of intellectual property rights.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">15. Termination</h2>
          <p>We may suspend or terminate your access to the Service at any time, with or without cause, with or without notice, at our sole discretion. Grounds for termination include, but are not limited to, violation of these Terms, fraudulent or abusive activity, non-payment, or extended inactivity.</p>
          <p>Upon termination: (a) your right to use the Service ceases immediately; (b) we may delete your account data after a reasonable retention period (typically 30 days); (c) any outstanding payment obligations survive; (d) all provisions that by their nature should survive termination — including disclaimers (Section 11), limitation of liability (Section 12), indemnification (Section 13), dispute resolution (Section 14), and governing law (Section 16) — will remain in full force and effect.</p>
          <p>You may terminate your account at any time by contacting us. Termination does not entitle you to a refund of any prepaid fees except as expressly provided herein or as required by law.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">16. Governing law and jurisdiction</h2>
          <p>These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict-of-law provisions. Subject to the arbitration provisions in Section 14, any legal action or proceeding arising out of these Terms shall be brought exclusively in the state or federal courts located in Delaware, and you consent to the personal jurisdiction of such courts.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">17. Force majeure</h2>
          <p>We shall not be liable for any failure or delay in performing our obligations under these Terms where such failure or delay results from circumstances beyond our reasonable control, including but not limited to: acts of God, natural disasters, war, terrorism, riots, embargoes, actions of civil or military authorities, fire, floods, epidemics, infrastructure failures, Internet disruptions, power outages, strikes, or the failure of third-party services (including but not limited to cloud hosting providers, AI model providers, database services, and payment processors).</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">18. General provisions</h2>
          <p><strong>Entire agreement.</strong> These Terms, together with the Privacy Policy, constitute the entire agreement between you and Memora regarding the Service and supersede all prior agreements, understandings, or representations.</p>
          <p><strong>Severability.</strong> If any provision of these Terms is held to be invalid, illegal, or unenforceable by a court of competent jurisdiction, such provision shall be modified to the minimum extent necessary to make it enforceable, or if it cannot be so modified, it shall be severed from these Terms. The remaining provisions shall continue in full force and effect.</p>
          <p><strong>No waiver.</strong> Our failure to enforce any right or provision of these Terms shall not constitute a waiver of that right or provision. Any waiver must be in writing and signed by us to be effective.</p>
          <p><strong>Assignment.</strong> You may not assign or transfer your rights or obligations under these Terms without our prior written consent. We may assign or transfer our rights and obligations under these Terms without restriction, including in connection with a merger, acquisition, or sale of assets.</p>
          <p><strong>Notices.</strong> We may send notices to you via the email address associated with your account or by posting on the Service. You agree that such notices satisfy any legal requirements for written communication.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-[rgb(var(--foreground))]">19. Contact</h2>
          <p>For questions about these Terms, please reach out via our <a href="/contact" className="underline hover:text-[rgb(var(--foreground))]">contact form</a>.</p>
        </section>
      </div>
    </div>
  );
}
