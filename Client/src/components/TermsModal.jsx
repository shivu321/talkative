// TermsModal.tsx
import React from "react";
import { Modal, Button } from "react-bootstrap";

export default function TermsModal({ show, handleClose }) {
  return (
    <Modal show={show} onHide={handleClose} size="lg" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>Legal Information</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* --- Terms and Conditions Section --- */}
        <h4 className="mb-3">Terms and Conditions for Talkative</h4>
        <p>
          <strong>Last Updated:</strong> August 25, 2025
        </p>
        <p>
          Welcome to Talkative! By accessing or using our application and
          services ("Service"), you agree to be bound by these Terms and
          Conditions ("Terms"). Please read them carefully.
        </p>

        <h6>1. Acceptance of Terms</h6>
        <p>
          By creating an account or using our Service, you confirm that you are
          at least <strong>18 years of age</strong> and legally capable of
          entering into a binding contract. You also agree to our Privacy
          Policy, which is incorporated herein by reference. If you do not
          agree to these Terms, you may not use our Service.
        </p>

        <h6>2. User Conduct and Prohibited Activities</h6>
        <p>
          You are solely responsible for your conduct and any content you
          transmit. You agree to use the Service in compliance with all
          applicable laws, including the Information Technology Act, 2000 of
          India. You agree NOT to:
        </p>
        <ul>
          <li>
            Engage in illegal, hateful, threatening, or defamatory behavior.
          </li>
          <li>
            Harm or exploit minors in any way. This service is strictly for
            users 18+.
          </li>
          <li>Transmit obscene, pornographic, or graphically violent content.</li>
          <li>Impersonate any person or entity.</li>
          <li>Infringe on intellectual property rights.</li>
          <li>
            Distribute spam, viruses, or use automated systems (bots, spiders)
            to access the service.
          </li>
        </ul>

        <h6>3. Moderation and Enforcement</h6>
        <p>
          While we are not obligated to monitor content, we reserve the right
          to remove content and terminate accounts for any user who violates
          these terms, at our sole discretion and without notice.
        </p>

        <h6>4. Disclaimer of Warranties & Limitation of Liability</h6>
        <p>
          The Service is provided "AS IS" and at your own risk. Talkative is
          not liable for any indirect, incidental, or consequential damages
          resulting from your use of the Service.
        </p>

        <h6>5. Governing Law</h6>
        <p>
          These Terms are governed by the laws of India. Any disputes will be
          subject to the exclusive jurisdiction of the courts in [Your City,
          India].
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
