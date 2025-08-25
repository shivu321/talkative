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
      {/* Helmet data remains completely untouched */}
      <Helmet>
        <title>Random Chat - Anonymous 1-to-1</title>
        <meta
          name="description"
          content="A simple, anonymous 1-to-1 chat application with text and video modes."
        />
        <meta name="robots" content="index, follow" />
        <title>
          Free Online Chat App | Omegle Alternative | TikTok, WhatsApp, Snapchat
          Style Chat
        </title>

        <meta
          name="description"
          content="Chat instantly with strangers and friends using the best Omegle alternative. Our online chat app combines TikTok-style fun, WhatsApp-like messaging, Snapchat streaks, Instagram DMs, Discord groups, and Telegram channels into one powerful chat experience. Connect worldwide with strangers, join group chats, start random video calls, or create private chat rooms. Our platform prevents catfishing, ensures secure video/audio calls, and offers trending features like short video chat reels, meme sharing, filters, AI chat bots, and live streaming. If you enjoy Omegle, TikTok, WhatsApp, Telegram, Discord, or Instagram, you’ll love our chat app – built for global conversations, dating, friendship, fun, and social networking."
        />

        <meta
          name="keywords"
          content="
online chat, free chat app, Omegle alternative, Omegle new site, Omegle India, TikTok chat, TikTok DM, TikTok reels chat, TikTok live, WhatsApp chat, WhatsApp web clone, WhatsApp alternative, Telegram chat, Telegram groups, Telegram channels, Telegram bot chat, Discord chat, Discord server chat, Discord groups, Discord online, Snapchat chat, Snapchat streaks, Snapchat live chat, Instagram chat, Instagram DM online, Instagram reels chat, Instagram live chat, Facebook chat, Facebook Messenger online, Facebook groups chat, dating chat, online dating app, video chat online, random chat app, stranger chat app, chat with strangers, global chat app, chat now, best chat app, international chat, chat with girls, chat with boys, meet new people, connect worldwide, talk to strangers, private chat rooms, group chat, safe chat app, anti catfish chat, secure video chat, random video calls, AI chat bot, ChatGPT chat app, free chatting website, chat hub, chatroulette style, virtual hangout, live chat app, short video chat, voice chat, audio call app, video call app, online friendship app, new chat friends, top chat apps 2025, online dating chat, teen chat rooms, chat with strangers India, chat USA, chat UK, chat Canada, chat Australia, Europe chat, Asian chat app, Omegle replacement, best Omegle alternative, TikTok trend chat, trending chat app, fun chat site, meme chat, gaming chat, esports chat, study chat rooms, music chat, movies chat, kpop chat, sports chat, crypto chat groups, forex chat groups, stock market chat, business networking chat, online collaboration chat, student chat app, university chat rooms, random anonymous chat, anonymous video chat, chat without login, instant chat free, stranger meet app, 1-on-1 video chat, dating chat online, teen dating chat, college chat, Omegle style chat, live streaming chat app, TikTok live rooms, Twitch chat style, YouTube live chat, fan community chat, VR chat online, metaverse chat, AI powered chat, chatbot friends, GPT chat friend, safe kids chat app, secure teen chat, modern social chat app
          "
        />

        {/* Open Graph (Facebook/Instagram Preview) */}
        <meta
          property="og:title"
          content="Free Online Chat App | Omegle Alternative + TikTok Style"
        />
        <meta
          property="og:description"
          content="A modern Omegle alternative with TikTok-style fun, WhatsApp-style messaging, and Discord/Telegram group chat. Free chat with strangers worldwide."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://talkative.co.in/" />
        <meta
          property="og:image"
          content="https://talkative.co.in/assets/talkative-logo"
        />

        {/* Twitter Meta */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="Free Online Chat App | Omegle Alternative"
        />
        <meta
          name="twitter:description"
          content="Join TikTok-style chat rooms, WhatsApp-like chats, random Omegle-style stranger chat, Snapchat streaks, Discord servers & Telegram channels."
        />
        <meta
          name="twitter:image"
          content="https://talkative.co.in/assets/talkative-logo"
        />

        {/* Robots + Canonical */}
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://talkative.co.in/" />
      </Helmet>
      
      {/* --- NEW, IMPROVED UI CONTAINER --- */}
          {sessionId === null ? (
            <ConsentPage onConsent={handleConsent} />
          ) : (
            <ChatPage sessionId={sessionId} />
          )}
    </>
  );
}
