import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | Cradlewell",
  description:
    "Terms & Conditions governing nurse-led newborn and postnatal home care services provided by Cradlewell.",
};

const TermsOfUse: React.FC = () => {
  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Terms & Conditions</h1>

      {/* 1. INTRODUCTION */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">1. Introduction</h2>
        <p>
          Welcome to <strong>Tenderkin Wellness Private Limited</strong> (“Company”, “We”, “Us”, or
          “Our”), operating under the brand name <strong>Cradlewell</strong> through the platform
          <a href="https://www.cradlewell.com" className="text-blue-600 underline ml-1">
            www.cradlewell.com
          </a>.
        </p>
        <p className="mt-3">
          We provide nurse-led newborn and postnatal home care services in Bangalore. These Terms
          govern your use of the Platform and all services offered by us.
        </p>
        <p className="mt-3">
          By accessing the Platform, booking services, or engaging with Cradlewell, you agree to be
          legally bound by these Terms along with our Privacy Policy and Refund & Cancellation Policy.
        </p>
        <p className="mt-3">
          We reserve the right to modify these Terms at any time. Continued use of services
          constitutes acceptance of updated Terms.
        </p>
      </section>

      {/* 2. APPLICATION OF POLICY */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">2. Application of Policy</h2>
        <p>
          These Terms apply to all interactions with Cradlewell including platform usage, service
          bookings, payments, communications, and care delivery.
        </p>
        <ul className="list-disc list-inside mt-3">
          <li>Account creation or registration</li>
          <li>Booking, rescheduling, or cancellation of services</li>
          <li>Payment of fees</li>
          <li>Acceptance of service confirmations</li>
          <li>Any conduct consistent with service usage</li>
        </ul>
        <p className="mt-3">
          We reserve the right to refuse or terminate services if these Terms are violated.
        </p>
      </section>

      {/* 3. ELIGIBILITY */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">3. Eligibility</h2>
        <ul className="list-disc list-inside">
          <li>You must be at least 18 years old and legally competent.</li>
          <li>You agree to comply with all applicable Indian laws.</li>
          <li>
            If acting on behalf of another individual, you confirm you have valid authorization.
          </li>
          <li>You must provide accurate and complete health-related information.</li>
          <li>
            Services are non-clinical. Medical emergencies must be handled by licensed healthcare
            providers.
          </li>
        </ul>
      </section>

      {/* 4. OUR SERVICES */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">4. Our Services</h2>
        <p>
          Cradlewell provides certified nurse-led newborn and postnatal home care services in
          Bengaluru.
        </p>
        <ul className="list-disc list-inside mt-3">
          <li>
            <strong>Day Care (8 hours):</strong> Baby bath, massage, feeding support, hygiene,
            diapering, maternal vitals.
          </li>
          <li>
            <strong>Night Care (10 hours):</strong> Overnight baby care, feeding guidance, sleep
            supervision, vitals, and one online consultation.
          </li>
        </ul>
        <p className="mt-3">
          These services are non-clinical and do not replace medical treatment.
        </p>
      </section>

      {/* 5. USER RESPONSIBILITIES */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">5. Your Responsibilities</h2>
        <ul className="list-disc list-inside">
          <li>Provide accurate personal and health-related information.</li>
          <li>Ensure a safe and hygienic environment for nurses.</li>
          <li>Make timely payments as agreed.</li>
          <li>Communicate promptly regarding schedules and changes.</li>
          <li>Use services strictly as intended.</li>
        </ul>
      </section>

      {/* 6. EXCLUSIONS */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">6. Exclusions</h2>
        <ul className="list-disc list-inside">
          <li>No clinical diagnosis or emergency medical care.</li>
          <li>No liability for delays due to incorrect user information.</li>
          <li>No responsibility for misuse or negligence.</li>
          <li>No liability for force majeure events.</li>
        </ul>
      </section>

      {/* 7. PROHIBITED ACTIVITIES */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">7. Prohibited Activities</h2>
        <ul className="list-disc list-inside">
          <li>Providing false or misleading information</li>
          <li>Interfering with service delivery</li>
          <li>Misusing care instructions</li>
          <li>Violating confidentiality or laws</li>
        </ul>
      </section>

      {/* 8. INTELLECTUAL PROPERTY */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">8. Intellectual Property Rights</h2>
        <p>
          All care protocols, training materials, platform content, and methodologies remain the
          exclusive property of Cradlewell.
        </p>
      </section>

      {/* 9. DATA & PRIVACY */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">9. Data & Privacy</h2>
        <p>
          Personal and health data is collected only for service delivery and handled in accordance
          with applicable laws and our Privacy Policy.
        </p>
      </section>

      {/* 10. FEES & PAYMENTS */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">10. Fees and Payments</h2>
        <p>
          Fees are as specified at booking. Advance payments may be required. Services may be
          suspended for non-payment.
        </p>
      </section>

      {/* 11. SHIFT HOURS */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">
          11. Shift Hours, Rest Periods & Overtime
        </h2>
        <p>
          Nurses require mandatory rest periods. Overtime beyond package hours will be billed
          separately at applicable rates.
        </p>
      </section>

      {/* 12. SERVICE QUALITY */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">
          12. Service Delivery & Quality Assurance
        </h2>
        <p>
          Any service concerns must be reported promptly. Failure to report implies acceptance of
          service quality.
        </p>
      </section>

      {/* 13. REFUND & CANCELLATION */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">13. Refund & Cancellation</h2>
        <p>
          Refunds are governed strictly by our Refund & Cancellation Policy. No refunds apply after
          service commencement.
        </p>
      </section>

      {/* 14–22 FINAL CLAUSES */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">14. Legal Provisions</h2>
        <p>
          These include Limitation of Liability, Indemnification, Dispute Resolution, Governing Law,
          Force Majeure, Severability, and Contact Information as per applicable Indian laws.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Contact Information</h2>
        <p>
          <strong>Tenderkin Wellness Private Limited</strong>
          <br />
          Site No. 26, Laskar Hosur, Adugodi
          <br />
          Koramangala, Bangalore – 560030
          <br />
          Email: <a href="mailto:care@cradlewell.com" className="text-blue-600 underline">
            care@cradlewell.com
          </a>
        </p>
      </section>

      <p className="text-sm text-gray-500 mt-10">
        Last updated: July 2025
      </p>
    </main>
  );
};

export default TermsOfUse;
