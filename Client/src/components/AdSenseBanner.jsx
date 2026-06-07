import React, { useEffect } from "react";

export default function AdSenseBanner({ slot, format = "horizontal", style = {} }) {
  useEffect(() => {
    try {
      if (window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      console.warn("AdSense push error:", e);
    }
  }, []);

  return (
    <div 
      className="adsense-container text-center py-2 px-3 border border-secondary border-opacity-10 rounded bg-dark bg-opacity-5 m-2 shadow-sm"
      style={{ minHeight: format === "vertical" ? "250px" : "60px", overflow: "hidden", ...style }}
    >
      <span 
        className="d-block text-uppercase text-secondary mb-1 select-none font-monospace fw-bold" 
        style={{ fontSize: "9px", letterSpacing: "0.08em" }}
      >
        Advertisement
      </span>
      <ins
        className="adsbygoogle"
        style={{ display: "block", ...style }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // Placeholder AdSense Client ID
        data-ad-slot={slot || "1234567890"}      // Placeholder AdSense Slot ID
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
