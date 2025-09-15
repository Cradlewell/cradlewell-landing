// app/terms/page.tsx (App Router) or pages/terms.tsx (Pages Router)

import React from 'react';
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | Nurse-led Newborn & Postnatal Home Care Bangalore - Cradlewell",
  description: "Explore Cradlewell's Terms & Conditions for Nurse-led Newborn and Postnatal Home Care in Bangalore. Discover How Our Transparent Policies, Secure Data Handling, and Trained Nursing Professionals Ensure Trusted, Safe, and Compassionate Care for Mothers and Babies at Home.",
  other: {
    keywords: `
      Cradlewell Terms of Use,
      home Care Service Agreement,
      nurse-led Care Terms,
      postnatal Care Policies,
      subscription Terms Cradlewell,
      maternity Care Terms and Conditions,
      user Agreement Bangalore,
      healthcare Service Contract,
      caregiving Service Terms
    `,
  },
};

const TermsOfUse: React.FC = () => {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Terms of Use</h1>

      <section className="mb-8">
        <p>
          Welcome to Cradlewells Terms of Use. We, <strong>Tenderkin Wellness Private Limited</strong>,
          a company incorporated under the Companies Act, 2013 and having its registered office at
          No.26, Laskar Hosur, Adugodi, Koramangala, Bangalore South, Bangalore- 560030, Karnataka
          (hereinafter referred to as the “Company”), operate our business under the brand name
          <strong> Cradlewell</strong>. These Terms of Use (hereinafter referred to as the
          Terms) represent our commitment to maintaining your trust and ensuring transparent use
          of our Platform.
        </p>
        <p className="mt-4">
          Cradlewell is a digital platform designed to offer postnatal and newborn home healthcare
          services delivered by trained nursing professionals, accessible through our Website (
          <a href="https://www.cradlewell.com" className="text-blue-600 underline">www.cradlewell.com</a>
          ) and mobile application.
        </p>
        <p className="mt-4">
          These Terms govern your use of our Website, application, services, and any other
          interaction with the Company. By using any part of the Platform, you enter into a
          contractual agreement with the Company, governed by these Terms and other associated
          policies including our <a href="/privacy-policy" className="text-blue-600 underline">Privacy Policy</a> and <a href="/refund-policy" className="text-blue-600 underline">Refund & Cancellation Policy</a>.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">1. Definitions and Interpretation</h2>
        <h3 className="font-semibold">1.1 Definitions</h3>
        <ul className="list-disc list-inside mb-4">
          <li><strong>Applicable Laws:</strong> All statutes, acts, rules, regulations, etc. in force within India.</li>
          <li><strong>Content:</strong> Includes all text, graphics, visuals, logos, etc. made available on the Platform.</li>
          <li><strong>Third Parties:</strong> Individuals or entities apart from the Company and User involved in services.</li>
          <li><strong>Service:</strong> Refers to intermediary services like caregiving, scheduling, and support content.</li>
        </ul>
        <h3 className="font-semibold">1.2 Interpretation</h3>
        <ul className="list-disc list-inside">
          <li><strong>Company/We/Us:</strong> Tenderkin Wellness Pvt Ltd and Cradlewell brand.</li>
          <li><strong>Platform:</strong> Cradlewells Website and app.</li>
          <li><strong>User/You:</strong> Any person who accesses or uses the Platform.</li>
          <li>Headings are for convenience and not for interpretation.</li>
          <li><strong>Parties:</strong> The Company and the User collectively.</li>
          <li>These Terms are read with Privacy Policy and Refund Policy.</li>
          <li>These Terms constitute a legally binding contract.</li>
          <li>The Company may modify these Terms at any time.</li>
        </ul>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">2. Platform Overview</h2>
        <p>Cradlewell is a technology platform connecting users to trained in-home caregivers.</p>
        <ul className="list-disc list-inside mt-2">
          <li>Caregivers assist postnatal mothers and infants, not emergency services.</li>
          <li>The Company may modify or upgrade the Platform from time to time.</li>
          <li>Caregiver assignment is based on availability and suitability.</li>
          <li>Users must be in a serviceable geography to use the platform.</li>
        </ul>
      </section>

      {/* You can continue this structure for all other sections: 3. Services, 4. Compliance, 5. Registration, 6. Eligibility, etc. */}

      {/* Example for another section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">3. Services on the Platform</h2>
        <p>The Platform offers curated, non-clinical caregiving services:</p>
        <ul className="list-disc list-inside mt-2">
          <li>Users subscribe to care packages through the Platform.</li>
          <li>Pre-service assessments are mandatory before service activation.</li>
          <li>Caregivers do not perform clinical or emergency procedures.</li>
        </ul>
      </section>

      <p className="text-sm text-gray-600 mt-12">
        Last updated on July 12, 2025.
      </p>

      <h2 className="mb-4">4. Compliance</h2>
      <p>
        This Terms of Use is published in compliance with the provisions of the
        Information Technology Act, 2000, as amended by the Information Technology
        (Amendment) Act, 2008, and in accordance with the following rules made thereunder:
      </p>
      <ul>
        <li>
          Rule 3(1) of the Information Technology (Intermediary Guidelines and Digital Media
          Ethics Code) Rules, 2021, which mandates the publication of terms and conditions,
          privacy policy, and user agreement for access or usage of an intermediarys computer
          resource; and
        </li>
        <li>
          Rule 4 of the Information Technology (Reasonable Security Practices and Procedures
          and Sensitive Personal Data or Information) Rules, 2011, which mandates the
          disclosure of security practices and procedures.
        </li>
      </ul>
      <p>
        This Terms of Use governs your access to and use of the Platform operated by Tenderkin
        Wellness Private Limited under the brand name Cradlewell. It constitutes a legally
        binding electronic contract under applicable Indian laws.
      </p>

      <h2 className="mt-5">5. Registration and Operations</h2>
      <p>
        To access and fully avail the caregiving services facilitated through the Platform,
        Users are required to register by creating a profile on the Platform. This includes
        providing accurate personal information:
      </p>
      <ul>
        <li>Full Name</li>
        <li>Contact Number</li>
        <li>Email Address</li>
        <li>Residential Address</li>
        <li>Maternity or newborn care needs</li>
        <li>Emergency Contact</li>
      </ul>
      <p>
        Registration may also be done through third-party integrations such as Google Sign-In.
        Guest browsing is allowed, but key features are restricted without registration.
      </p>
      <p>
        Users are responsible for keeping their credentials secure. Misuse, false information,
        or suspected fraud may lead to account termination. Refer to our{" "}
        <a href="/privacy-policy">Privacy Policy</a> for full details on data handling.
      </p>

      <h2 className="mt-5">6. Eligibility</h2>
      <p>
        By using the Platform, you confirm that you are of legal age and are authorized to use
        caregiving services for yourself or another. You agree to comply with all applicable
        laws and not use the Platform if you are legally restricted or prohibited from doing so.
      </p>

      <h2 className="mt-5">7. Payments, Cancellations & Refunds</h2>
      <h5>7.1. Subscription Billing</h5>
      <p>
        Cradlewell operates on a monthly subscription basis. You authorize auto-debit for
        renewals unless canceled in time.
      </p>
      <h5>7.2. Cancellation Policy</h5>
      <p>
        Cancel at least 7 days before your next billing cycle to avoid renewal charges.
      </p>
      <h5>7.3. Refund Eligibility</h5>
      <ul>
        <li>Cancellation within 5 days of payment or service start</li>
        <li>Cradlewells operational non-fulfillment</li>
        <li>Medical emergency or relocation (with proof)</li>
        <li>Verified service quality issue (within 3 days)</li>
        <li>Duplicate transactions</li>
      </ul>
      <h5>7.4. Refund Processing</h5>
      <p>
        Refunds will be issued within 7–10 working days, subject to processing deductions.
      </p>
      <h5>7.5. Non-Refundable Scenarios</h5>
      <ul>
        <li>Partial usage of service</li>
        <li>User dissatisfaction not caused by Cradlewell</li>
        <li>Unavailable caregiver preference when qualified staff is provided</li>
      </ul>

      <h2 className="mt-5">8. Data Privacy</h2>
      <h5>8.1. Data Collection and Retention</h5>
      <p>
        Personal data is collected and stored securely for up to 3 years after service ends or
        as legally required.
      </p>
      <h5>8.2. Purpose of Use</h5>
      <ul>
        <li>Coordinating caregiving and scheduling</li>
        <li>Communicating service updates</li>
        <li>Internal analytics for improvement</li>
      </ul>
      <h5>8.3. Privacy Policy</h5>
      <p>
        All data practices are covered under our
        <a href="/privacy-policy">Privacy Policy</a>. By using the Platform, you agree to its
        terms.
      </p>

      <h2 className="mt-5">9. Content</h2>
      <h5>9.1. General</h5>
      <p>
        While we strive to provide accurate content, we dont guarantee its completeness or
        reliability.
      </p>
      <h5>9.2. Intellectual Property</h5>
      <p>
        All content belongs to Cradlewell or its licensors and may not be used without written
        consent.
      </p>
      <h5>9.3. User-Generated Content</h5>
      <p>
        You are responsible for any feedback or reviews you post. The Company reserves the
        right to remove inappropriate content.
      </p>
      <h5>9.4. Limited License</h5>
      <p>
        You are granted a personal, limited, revocable license to access the Platform and use
        its content non-commercially.
      </p>

          <h2>10. Termination</h2>
      <p>We reserve the right to suspend or terminate your access to our Services at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties, or for any other reason.</p>

      <h2>11. Disclaimers</h2>
      <p>Our Services are provided as is and as available without warranties of any kind, either express or implied. We disclaim all warranties, including but not limited to merchantability, fitness for a particular purpose, and non-infringement. We do not guarantee that the Services will be uninterrupted, secure, or error-free.</p>

      <h2>12. Limitation of Liability</h2>
      <p>To the fullest extent permitted by law, Cradlewell and its affiliates, officers, employees, agents, and partners shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses, resulting from:
      </p>
              <ul>
          <li>Your use or inability to use the Services.</li>
          <li>Any unauthorized access to or use of our servers and/or any personal information stored therein.</li>
          <li>Any interruption or cessation of transmission to or from the Services.</li>
          <li>Any bugs, viruses, trojan horses, or the like that may be transmitted to or through our Services by any third party.</li>
          <li>Any errors or omissions in any content or for any loss or damage incurred as a result of the use of any content posted, emailed, transmitted, or otherwise made available through the Services.</li>
        </ul>

      <h2>13. Indemnification</h2>
      <p>You agree to indemnify, defend, and hold harmless Cradlewell, its affiliates, officers, agents, and employees from any claim, demand, damages, or other losses, including reasonable attorneys fees, arising out of your use of the Services, your violation of these Terms, or your violation of any rights of another.</p>

      <h2>14. Governing Law</h2>
      <p>These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any disputes arising out of or relating to these Terms or the Services shall be subject to the exclusive jurisdiction of the courts located in Hyderabad, India.</p>

      <h2>15. Dispute Resolution</h2>
      <p>In the event of any dispute, the parties shall attempt to resolve the matter amicably. If resolution is not achieved within thirty (30) days, the dispute shall be referred to arbitration in accordance with the Arbitration and Conciliation Act, 1996. The arbitration shall be conducted in Hyderabad, India, in English, and the decision shall be final and binding.</p>

      <h2>16. Changes to the Terms</h2>
      <p>We may update these Terms from time to time. If we make material changes, we will provide notice through our Services or by other means. Your continued use of the Services after such changes constitutes your acceptance of the new Terms.</p>

      <h2>17. Contact Information</h2>
      <p>If you have any questions about these Terms, please contact us at:</p>
      <p>
        <strong>Cradlewell Technologies Private Limited</strong><br />
        2nd Floor, Ramkishan Plaza, Miyapur<br />
        Hyderabad, Telangana – 500049, India<br />
        <strong>Email:</strong> info@cradlewelltech.com
      </p>

      <h2>18. Entire Agreement</h2>
      <p>These Terms, along with our Privacy Policy, constitute the entire agreement between you and Cradlewell regarding the use of our Services and supersede any prior agreements between you and Cradlewell.</p>

      <h2>19. Severability</h2>
      <p>If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall remain in full force and effect.</p>


<h2>20. FORCE MAJEURE</h2>
<p>
  20.1. Cradlewell shall not be liable for any delay, interruption, or failure to perform any
  of its obligations under these Terms of Use or provide services via the Platform if such
  delay or failure results from events beyond its reasonable control, whether foreseen or
  unforeseen, including but not limited to:
</p>
<ul>
  <li>20.1.1. Acts of God, natural disasters, earthquakes, floods, pandemics, epidemics, or adverse weather conditions;</li>
  <li>20.1.2. Acts of war, terrorism, civil unrest, government orders or lockdowns;</li>
  <li>20.1.3. Labor shortages, strikes, caregiver unavailability, or disruptions in third-party caregiving networks;</li>
  <li>20.1.4. Technical issues such as internet outages, disruption of telecommunications, cloud infrastructure failure, data center downtime, sea cable breakages, or any other failure of digital service infrastructure not within Cradlewells direct control;</li>
  <li>20.1.5. Cyber incidents, including but not limited to hacking, phishing attacks, malicious software intrusion, or other unauthorized access attempts;</li>
  <li>20.1.6. Festive disruptions, regional curfews, or public safety restrictions that impact service delivery or movement of caregiving professionals.</li>
</ul>
<p>
  20.2. In the event of such a force majeure occurrence:
</p>
<ul>
  <li>20.2.1. <strong>Rescheduling &amp; User Communication:</strong> Cradlewell shall make reasonable efforts to notify affected Users of the delay or disruption and, where feasible, offer alternative schedules or equivalent service options at the earliest possible time.</li>
</ul>
<p>
  20.3. <strong>Third-Party Dependencies:</strong> Cradlewell shall not be held liable for failures or deficiencies in services that are dependent on third-party caregiving partners, software providers, payment gateways, or any other outsourced service providers impacted by such events.
</p>
<p>
  20.4. <strong>Limitation of Liability:</strong> Cradlewell disclaims all liabilities arising from such force majeure events, including but not limited to missed or delayed caregiver visits, inability to access the Platform or app features, or temporary unavailability of service-related communication.
</p>
<p>
  20.5. You acknowledge and agree that the services offered by Cradlewell are highly dependent on both digital infrastructure and physical personnel availability, and certain disruptions may be unavoidable despite reasonable diligence and preventive efforts.
</p>
<p>
  20.6. The provisions of this clause shall survive the termination or expiry of these Terms of Use.
</p>

<h2>21. DISPUTE RESOLUTION AND JURISDICTION</h2>
<p>
  21.1. These Terms shall be governed and interpreted by and construed in accordance with the substantive laws of India and subject to arbitration provisions below, each party hereby irrevocably and finally submits to the exclusive jurisdiction of the courts of Bangalore, Karnataka, India thereto in respect of any disputes, legal action or proceedings arising out of or in connection with the Terms, interpretation, duties, performance, breach, etc. of these Terms.
</p>
<p>
  21.2. Should any Dispute arise out of or in connection with these Terms, the Parties hereto shall first endeavor to settle such Dispute amicably. If the Dispute is not resolved through amicable settlement within fifteen (15) days after commencement of discussions or such longer period as the Parties mutually agree in writing, then either Party may refer the Dispute for resolution by arbitration according to the provisions of the Arbitration and Conciliation Act, 1996 (India) or any statutory amendment or re-enactment thereof, or any statute enacted to replace the same, for the time being in force. The arbitration shall be conducted by a sole arbitrator appointed by mutual consent of the parties. The seat and venue of arbitration shall be in Bangalore, Karnataka, India, and the language of the proceedings shall be English.
</p>
<p>
  21.3. The Award rendered in any arbitration commenced hereunder shall be final and conclusive, and judgment thereon may be entered in any court having jurisdiction for its enforcement. The Parties undertake to implement the arbitration award. In addition, the Parties agree that no Party shall have any right to commence or maintain a suit or legal proceeding concerning a Dispute hereunder (other than for preventive or interlocutory relief pending completion of the arbitration proceedings under these Terms) until the Dispute has been determined in accordance with the arbitration procedure provided for herein and then only for the enforcement of the award rendered in such arbitration. When any Dispute is under arbitration, except for the matters under dispute, the Parties shall continue to exercise their remaining respective rights and fulfil their remaining respective obligations under these Terms.
</p>

<h2>22. MISCELLANEOUS PROVISIONS</h2>
<p>
  22.1. <strong>Entire Agreement:</strong> These Terms of Use, read with the Privacy Policy and Disclaimer form the complete and final contract between us with respect to the subject matter hereof and supersedes all other communications, representations, and agreements (whether oral, written, or otherwise) relating thereto.
</p>
<p>
  22.2. <strong>Waiver:</strong> The failure at any time to require the performance of any provision of these Terms of Use shall in no manner affect our right at a later time to enforce the same. No waiver by us of any breach of these Terms of Use, whether by conduct or otherwise, in any one or more instances, shall be deemed to be or construed as a further or continuing waiver of any such breach, or a waiver of any other breach of these Terms of Use.
</p>
<p>
  22.3. <strong>Severability:</strong> If any provision/clause of these Terms of Use is held to be invalid, illegal, or unenforceable by any court or authority of competent jurisdiction, the validity, legality, and enforceability of the remaining provisions/clauses of these Terms of Use shall in no way be affected or impaired thereby, and each such provision/clause of these Terms of Use shall be valid and enforceable to the fullest extent permitted by Applicable Law. In such case, these Terms of Use shall be reformed to the minimum extent necessary to correct any invalidity, illegality or unenforceability, while preserving to the maximum extent the original rights, intentions and commercial expectations of the Parties hereto, as expressed herein.
</p>
<p>
  22.4. <strong>Contact Us:</strong> If you have any questions about these Terms of Use, the practices of the Website, or your experience, you can contact us by emailing us at <a href="mailto:care@cradlewell.com">care@cradlewell.com</a> or by writing to us at:
</p>
<p>
  Tenderkin Wellness Private Limited<br />
  Site No. 26, Laskar Hosur, Adugodi,<br />
  Koramangala, Bangalore South,<br />
  Bangalore - 560030, Karnataka.
</p>

      </section>



    </main>
  );
};

export default TermsOfUse;
