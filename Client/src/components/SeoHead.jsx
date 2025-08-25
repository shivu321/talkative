// src/components/SEOHead.js

import React from 'react';
import { Helmet } from 'react-helmet';

// Set default values for props
const SEOHead = ({ 
  title = "Talkative - Free Random Chat & Omegle Alternative",
  description = "Chat instantly with strangers on Talkative, the best Omegle alternative.",
  url = "https://talkative.co.in/",
  imageUrl = "https://talkative.co.in/assets/talkative-logo.png" 
}) => {

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Talkative",
    "url": url,
    "applicationCategory": "SocialNetworking",
    "description": description,
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  return (
    <Helmet>
      {/* --- Primary Meta Tags --- */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content="Omegle, TikTok chat, online chat, stranger chat, random video chat" />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={url} />
      
      {/* --- Open Graph / Facebook --- */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />

      {/* --- Twitter --- */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {/* --- Structured Data (JSON-LD) for Rich Snippets --- */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};

export default SEOHead;
