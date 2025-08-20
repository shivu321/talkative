// PrivacyModal.tsx
import React from "react";
import { Modal, Button } from "react-bootstrap";

export default function PrivacyModal({ show, handleClose }) {
  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Privacy Policy</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <h5>Privacy Policy</h5>
        <p>
          <strong>Last Updated:</strong> Aug 2025
        </p>
        <p>
          We value your privacy. In compliance with Indian IT Act, 2000 and
          related rules, we collect minimal information...
        </p>
        <ul>
          <li>We collect: Name, email, age confirmation.</li>
          <li>We use: to connect you with random users securely.</li>
          <li>
            We do not sell your data. We may comply with law enforcement if
            required.
          </li>
        </ul>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
