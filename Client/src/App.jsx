import React, { useState } from "react";
import ConsentPage from "./pages/ConsentPage";
import ChatPage from "./pages/ChatPage";
import { Helmet } from "react-helmet";
import "./styles.css"; // Global styles for the app

export default function App() {
  const id = localStorage.getItem("sessionId") || null;
  const [sessionId, setSessionId] = useState(id);

  // The onConsent handler now also saves the ID to localStorage
  const handleConsent = (sid) => {
    localStorage.setItem("sessionId", sid);
    setSessionId(sid);
  };

  return (
    <>
      <Helmet>
        <title>Random Chat — Anonymous 1-to-1</title>
        <meta name="description" content="A simple, anonymous 1-to-1 chat application with text and video modes." />
        <meta name="robots" content="index, follow" />
        {/* It's good practice to link your favicon here */}
        {/* <link rel="icon" href="/favicon.ico" /> */}
      </Helmet>

      <div className="app-container">
        {/* The background is now a pure decorative element */}
        <div className="app-background">
          <svg
            className="animated-bg"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
          >
            <path
              fill="#6c63ff"
              d="M0,64L40,85.3C80,107,160,149,240,176C320,203,400,213,480,192C560,171,640,117,720,117.3C800,117,880,171,960,165.3C1040,160,1120,96,1200,80C1280,64,1360,96,1400,112L1440,128L1440,0L0,0Z"
            >
              <animate
                attributeName="d"
                dur="20s"
                repeatCount="indefinite"
                values="
                  M0,64L40,85.3C80,107,160,149,240,176C320,203,400,213,480,192C560,171,640,117,720,117.3C800,117,880,171,960,165.3C1040,160,1120,96,1200,80C1280,64,1360,96,1400,112L1440,128L1440,0L0,0Z;
                  M0,32L40,69.3C80,107,160,181,240,197.3C320,213,400,171,480,138.7C560,107,640,85,720,90.7C800,96,880,128,960,138.7C1040,149,1120,139,1200,144C1280,149,1360,171,1400,181.3L1440,192L1440,0L0,0Z;
                  M0,64L40,85.3C80,107,160,149,240,176C320,203,400,213,480,192C560,171,640,117,720,117.3C800,117,880,171,960,165.3C1040,160,1120,96,1200,80C1280,64,1360,96,1400,112L1440,128L1440,0L0,0Z;
                "
              />
            </path>
          </svg>
        </div>

        {/* The main content area smartly handles layout for both pages */}
        <main className="app-main-content">
          {sessionId === null ? (
            <ConsentPage onConsent={handleConsent} />
          ) : (
            <ChatPage sessionId={sessionId} />
          )}
        </main>
      </div>
    </>
  );
}
