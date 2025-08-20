// TermsModal.tsx
import React from "react";
import { Modal, Button } from "react-bootstrap";

export default function TermsModal({ show, handleClose }) {
  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Terms & Conditions</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <h5>Terms & Conditions</h5>
        <p>
          <strong>Last Updated:</strong> Aug 2025
        </p>
        <p>
          By using this platform, you agree to comply with Indian laws,
          including IT Act, 2000.
        </p>
        <ul>
          <li>You must be 18+ to use this service.</li>
          <li>No abusive, obscene, or illegal content.</li>
          <li>We may suspend users who misuse the service.</li>
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
