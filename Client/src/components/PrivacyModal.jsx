// PrivacyPolicyModal.tsx
import React from "react";
import { Modal, Button } from "react-bootstrap";

export default function PrivacyPolicyModal({ show, handleClose }) {
  return (
    <Modal show={show} onHide={handleClose} size="lg" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>Privacy Policy</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <h4 className="mb-3">Privacy Policy for Talkative</h4>
        <p>
          <strong>Last Updated:</strong> August 25, 2025
        </p>
        <p>
          Talkative ("we," "us," or "our") is committed to protecting your
          privacy. This Privacy Policy explains how we collect, use, disclose,
          and safeguard your information when you use our services. This policy
          is framed in accordance with India's Information Technology Act, 2000,
          and its associated rules, including the SPDI Rules [81].
        </p>

        <h6>1. Your Consent</h6>
        <p>
          By using our Service, you provide your express consent to the
          collection, use, and disclosure of your personal information as
          described in this Privacy Policy. You can withdraw your consent at
          any time by deleting your account and discontinuing use of the Service.
        </p>

        <h6>2. Information We Collect</h6>
        <p>
          To provide our service, we collect the following types of information:
        </p>
        <ul>
          <li>
            <strong>Session Identifier:</strong> We generate a unique, anonymous{" "}
            <code>sessionId</code> to operate your session. We do not require
            your name, email, or phone number.
          </li>
          <li>
            <strong>Chat & Video Content:</strong> Text messages and video streams
            are transmitted between users. We do not store or record these
            conversations after the session ends, except for data related to
            user reports for moderation purposes.
          </li>
          <li>
            <strong>Usage Data:</strong> We automatically collect non-personal
            technical data, such as your IP address, device type, and
            connection timestamps, for security, analytics, and service
            improvement [84].
          </li>
        </ul>

        <h6>3. How We Use Your Information</h6>
        <p>
          We use the information we collect solely to:
        </p>
        <ul>
          <li>Provide, operate, and maintain our Service.</li>
          <li>Match you with other users.</li>
          <li>Improve and personalize your experience.</li>
          <li>Monitor for and prevent abuse, fraud, and other harmful activities.</li>
          <li>Comply with legal obligations under Indian law [81].</li>
        </ul>

        <h6>4. How We Share Your Information</h6>
        <p>
          We do not sell or rent your personal information. We only share data in
          the following limited circumstances:
        </p>
        <ul>
          <li>
            <strong>With Your Chat Partner:</strong> Live data is shared to
            enable communication.
          </li>
          <li>
            <strong>For Legal Reasons:</strong> We may disclose information if
            required by law or a valid legal request from Indian authorities [81].
          </li>
          <li>
            <strong>With Service Providers:</strong> Data may be shared with
            third-party vendors (e.g., server hosts) under strict
            confidentiality agreements.
          </li>
        </ul>

        <h6>5. Data Security and Retention</h6>
        <p>
          We implement reasonable security practices as mandated by the SPDI
          Rules to protect your information [85]. We do not store chat logs or video
          streams after your session. Data related to user reports may be
          retained for investigation purposes.
        </p>

        <h6>6. Your Rights and Grievance Officer</h6>
        <p>
          As a user in India, you have the right to access your information,
          correct it, and withdraw consent. For any grievances, please contact
          our Grievance Officer.
        </p>
        <div className="border p-3 rounded bg-light">
          <p className="mb-1">
            <strong>Grievance Officer for Talkative</strong>
          </p>
          <ul className="list-unstyled mb-0">
            <li>
              <strong>Name:</strong> [Name of Grievance Officer]
            </li>
            <li>
              <strong>Email:</strong> grievance-officer@talkative.co.in
            </li>
            <li>
              <strong>Address:</strong> [Your Company's Physical Address, India]
            </li>
          </ul>
        </div>
        <p className="mt-3">
          The Grievance Officer will address your complaint within one month from
          the date of receipt, as required by law.
        </p>
        
        <h6>7. Changes to This Privacy Policy</h6>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page. You are advised to review this Privacy Policy periodically for any changes.
        </p>

      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={handleClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
