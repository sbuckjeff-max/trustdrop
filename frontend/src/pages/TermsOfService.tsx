import { Link } from 'react-router-dom';

export default function TermsOfService() {
  return (
    <main className="page">
      <section className="card" style={{ maxWidth: '800px' }}>
        <h1>Terms of Service</h1>
        <p className="muted">Last updated: July 16, 2026</p>

        <div className="prose">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using TrustDrop (&ldquo;the Platform&rdquo;), you agree to be bound by these Terms of Service
            (&ldquo;Terms&rdquo;). If you do not agree, do not use the Platform. These Terms form a binding legal agreement
            between you (&ldquo;User,&rdquo; &ldquo;you&rdquo;) and TrustDrop.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            TrustDrop provides software that enables coin and collectable dealers to manage delivery logistics. TrustDrop is
            a <strong>software platform only</strong> — it is not a courier service, carrier, freight forwarder, or logistics
            provider. TrustDrop does not transport, handle, insure, or take custody of any items.
          </p>

          <h2>3. User Responsibilities</h2>
          <p>
            Dealers and couriers are solely responsible for their own actions, including but not limited to: vetting couriers,
            arranging deliveries, setting delivery terms, and ensuring compliance with all applicable laws. TrustDrop does
            not screen, endorse, or guarantee any courier&rsquo;s performance, reliability, or honesty.
          </p>

          <h2>4. Assumption of Risk</h2>
          <p>
            <strong>You use the Platform entirely at your own risk.</strong> Delivery of valuable items involves inherent
            risks including loss, theft, damage, and fraud. TrustDrop is not responsible for any loss, damage, or theft of
            items, nor for any disputes between dealers and couriers, or dealers and their customers. You assume all risk
            associated with using the Platform.
          </p>

          <h2>5. Limitation of Liability</h2>
          <p>
            <strong>To the maximum extent permitted by applicable law:</strong>
          </p>
          <ul>
            <li>
              TrustDrop&rsquo;s total liability for any claim arising out of or relating to the Platform is limited to the
              greater of (a) the fees you paid to TrustDrop in the twelve (12) months before the claim, or (b) one hundred
              dollars ($100.00 USD).
            </li>
            <li>
              TrustDrop shall not be liable for any indirect, incidental, special, consequential, or punitive damages,
              including but not limited to lost profits, lost revenue, lost data, business interruption, or damage to
              reputation, even if advised of the possibility of such damages.
            </li>
            <li>
              These limitations apply regardless of the theory of liability — whether in contract, tort (including
              negligence), strict liability, or otherwise — and even if a limited remedy fails of its essential purpose.
            </li>
          </ul>

          <h2>6. Personal Liability Shield</h2>
          <p>
            <strong>No personal liability for owner or family:</strong> The owner(s) of TrustDrop and their immediate family
            members (spouse, children, parents, siblings) shall have no personal liability for any claims, damages, losses,
            or obligations arising from or related to the Platform. All claims are solely against the Platform&rsquo;s
            corporate entity, and no claimant may seek recourse against the personal assets of the owner or their family
            members under any legal theory.
          </p>

          <h2>7. Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless TrustDrop, its owner(s), and their immediate family members
            from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable
            attorneys&rsquo; fees) arising out of or related to:
          </p>
          <ul>
            <li>Your use of the Platform;</li>
            <li>Your violation of these Terms;</li>
            <li>Your violation of any law or third-party right;</li>
            <li>Any dispute between you and another user;</li>
            <li>Any loss, theft, or damage to items managed through the Platform.</li>
          </ul>

          <h2>8. No Warranty</h2>
          <p>
            <strong>The Platform is provided &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; without warranty of any kind.</strong>
            TrustDrop disclaims all warranties, express or implied, including but not limited to:
          </p>
          <ul>
            <li>Merchantability or fitness for a particular purpose;</li>
            <li>Uninterrupted, secure, or error-free operation;</li>
            <li>Accuracy or reliability of any information on the Platform;</li>
            <li>Performance, honesty, or reliability of any courier or dealer;</li>
            <li>Safety or successful delivery of any item.</li>
          </ul>

          <h2>9. Third-Party Services</h2>
          <p>
            The Platform may integrate with or link to third-party services (e.g., mapping services, background check
            providers). TrustDrop is not responsible for the content, accuracy, or practices of any third-party services.
          </p>

          <h2>10. Modifications to Terms</h2>
          <p>
            TrustDrop reserves the right to modify these Terms at any time. Changes take effect when posted. Continued use
            of the Platform after changes constitutes acceptance of the modified Terms. If you do not agree to the changes,
            you must stop using the Platform.
          </p>

          <h2>11. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the State of Delaware, without regard to conflict of law principles.
            Any dispute arising from these Terms shall be resolved exclusively in the state or federal courts located in
            Delaware.
          </p>

          <h2>12. Severability</h2>
          <p>
            If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or
            eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
          </p>

          <hr />

          <p className="muted" style={{ fontSize: '0.85rem', marginTop: '24px' }}>
            <strong>Disclaimer:</strong> This document does not constitute legal advice. It is provided for informational
            purposes only. Consult a qualified attorney for legal guidance specific to your situation.
          </p>
        </div>

        <div style={{ marginTop: '24px' }}>
          <Link className="button secondary" to="/register">
            &larr; Back to registration
          </Link>
        </div>
      </section>
    </main>
  );
}
