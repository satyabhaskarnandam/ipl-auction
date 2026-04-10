import { memo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ScrollWrapper from "./ScrollWrapper";
import { IPL_TEAMS } from "../data/teams";
import { formatAmount } from "../lib/formatAmount";
import AuctionCommentaryBlock from "./AuctionCommentaryBlock";

const teamById = Object.fromEntries(IPL_TEAMS.map((t) => [t.id, t]));

function TeamLogoBadge({ teamId, size = "sm" }) {
  const team = teamById[teamId];
  const [imageError, setImageError] = useState(false);
  
  if (!team) return <span className="text-slate-400">({teamId})</span>;
  
  const urls = team.logoUrls || [];
  let src = "";
  
  if (!imageError && urls.length > 0) {
    src = urls[0];
  } else if (imageError && urls.length > 1) {
    src = urls[1];
  }
  
  const isSm = size === "sm";
  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden rounded-lg bg-transparent ${isSm ? "h-6 w-6" : "h-8 w-8"}`}
      title={teamId}
      style={{ backgroundColor: "transparent" }}
    >
      {src ? (
        <img 
          src={src} 
          alt={teamId}
          onError={() => setImageError(true)}
          className="h-full w-full object-contain bg-transparent" 
          style={{ backgroundColor: "transparent", imageRendering: "crisp-edges", WebkitOptimizeContrast: "revert" }}
        />
      ) : (
        <span className="text-[10px] font-bold text-white">{team.short}</span>
      )}
    </span>
  );
}

function ChatPanel({ chatMessages, onSend, compact, roomId }) {
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const CHAT_LOCK_COUNT = 10;
  const lockChatHeight = chatMessages.length > CHAT_LOCK_COUNT;

  // Auto-scroll to bottom when new messages arrive - scroll within container only
  useEffect(() => {
    const wrapper = messagesContainerRef.current;
    if (wrapper) {
      setTimeout(() => {
        const scrollElement = wrapper.getScrollElement ? wrapper.getScrollElement() : wrapper;
        if (scrollElement) {
          scrollElement.scrollTop = scrollElement.scrollHeight;
        }
      }, 0);
    }
  }, [chatMessages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputRef.current) return;
    
    const msg = inputRef.current.value.trim();
    if (!msg) return;
    
    // Clear DOM input immediately to prevent merging in high-speed typing
    inputRef.current.value = "";
    
    onSend(msg);
  };

  const parseLegacyMessage = (msg) => {
    if (!msg || typeof msg !== "string") return null;
    const bidMatch = msg.match(/^([A-Z]+) bid ₹([\d.]+) Cr for (.+)$/);
    if (bidMatch)
      return { type: "bid", team: bidMatch[1], amount: Number(bidMatch[2]), playerName: bidMatch[3].trim() };
    const soldMatch = msg.match(/^SOLD: (.+) to ([A-Z]+) for ₹([\d.]+) Cr$/);
    if (soldMatch)
      return { type: "sold", playerName: soldMatch[1].trim(), team: soldMatch[2], amount: Number(soldMatch[3]) };
    const unsoldMatch = msg.match(/^UNSOLD: (.+)$/);
    if (unsoldMatch) return { type: "unsold", playerName: unsoldMatch[1].trim() };
    return null;
  };

  const renderAuctionEvent = (evt, item) => {
    if (!evt) return null;
    if (evt.type === "sold") {
      if (!evt.team || !evt.amount) return null; // Prevent malformed historical events from rendering
      return (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">Sold</span>
          <span className="font-medium text-white drop-shadow-sm">{evt.playerName}</span>
          <span className="text-white/70">→</span>
          {evt.team ? <TeamLogoBadge teamId={evt.team} size="sm" /> : <span className="font-semibold text-emerald-100">{evt.team}</span>}
          <span className="font-semibold text-emerald-400">₹{formatAmount(evt.amount)}</span>
        </div>
      );
    }
    if (evt.type === "bid") {
      return (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/90">Bid</span>
          <span className="font-medium text-white drop-shadow-sm">{evt.playerName}</span>
          <span className="text-white/70">→</span>
          {evt.team ? <TeamLogoBadge teamId={evt.team} size="sm" /> : null}
          <span className="font-semibold text-white">₹{formatAmount(evt.amount)}</span>
        </div>
      );
    }
    if (evt.type === "unsold") {
      return (
        <div className="text-sm">
          <span className="font-medium text-amber-100">{evt.playerName}</span>
          <span className="ml-2 text-amber-200/80">→ Unsold</span>
        </div>
      );
    }
    if (evt.type === "playerJoined") {
      return (
        <div className="text-sm">
          <span className="font-medium text-cyan-100">{evt.playerName}</span>
          <span className="ml-1 text-slate-300">joined the room</span>
        </div>
      );
    }
    if (evt.type === "teamSelected") {
      return (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-emerald-100">{evt.playerName}</span>
          <span className="text-slate-300">selected</span>
          {evt.team ? <TeamLogoBadge teamId={evt.team} size="sm" /> : null}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`chat-panel-wrapper relative overflow-hidden flex min-h-0 flex-col h-auto p-2 ${compact ? "" : "rounded-3xl border border-line bg-panel shadow-lg"}`}>
      <ScrollWrapper
        ref={messagesContainerRef}
        maxHeight="600px"
        className="min-h-0 p-2 pr-6 text-sm flex flex-col gap-1.5"
      >
        {chatMessages
          .filter((item) => {
            if (!item.isSystem) return true;
            const evt = item.auctionEvent || parseLegacyMessage(item.message);
            if (!evt) return false;
            // Prevent malformed DB sold events that lack pricing/team info from cluttering UI
            if (evt.type === "sold" && (!evt.team || !evt.amount)) return false;
            return ["playerJoined", "teamSelected", "bid", "sold", "unsold"].includes(evt.type);
          })
          .map((item, index) => {
          const evt = item.isSystem ? (item.auctionEvent || parseLegacyMessage(item.message)) : null;
          const teamBg = evt && (evt.type === "bid" || evt.type === "sold") && evt.team ? teamById[evt.team]?.tileBg : null;
          
          if (evt && (evt.type === "sold" || evt.type === "unsold")) {
            const isUnsold = evt.type === "unsold";
            return (
              <motion.div 
                key={`${item.sentAt}-${index}`} 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="flex flex-col gap-1.5 mb-1.5"
              >
                <div
                  className={`rounded-xl p-2 bg-no-repeat ${
                    isUnsold
                      ? "border border-slate-700/50 bg-slate-900/50"
                      : teamBg
                        ? teamBg
                        : "border border-amber-500/30 bg-amber-950/30"
                  }`}
                >
                  {renderAuctionEvent(evt, item)}
                </div>
                <div className="w-full mt-1">
                  <AuctionCommentaryBlock
                    status={isUnsold ? "UNSOLD" : "SOLD"}
                    player={evt.playerName}
                    team={evt.team}
                    soldPrice={evt.amount}
                    teamName={teamById[evt.team]?.short || evt.team}
                    timestamp={item.sentAt}
                    id={item.sentAt || item.id || index}
                    roomId={roomId}
                  />
                </div>
              </motion.div>
            );
          }

          return (
            <motion.div
              key={`${item.sentAt}-${index}`}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              style={{ marginBottom: 6 }}
              className={`rounded-xl p-2 bg-no-repeat ${
                item.isSystem
                  ? teamBg
                    ? `${teamBg}`
                    : "border border-amber-500/40 bg-amber-950/50"
                  : "bg-slate-900/80 border border-slate-800"
              }`}
            >
              {item.isSystem ? (
                evt ? (
                  renderAuctionEvent(evt, item)
                ) : (
                  <p className="text-sm font-medium text-amber-100">{item.message}</p>
                )
              ) : (
                <>
                  <p className="font-semibold text-slate-100">
                    {item.username}{" "}
                    <span className="text-slate-400">({item.team})</span>
                  </p>
                  <p className="text-slate-200">{item.message}</p>
                </>
              )}
            </motion.div>
          );
        })}
      </ScrollWrapper>
      <form onSubmit={handleSubmit} className="flex gap-2 pt-3 border-t border-slate-700/50">
        <input
          ref={inputRef}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSubmit(e);
            }
          }}
          placeholder="Type message..."
          className="w-full rounded-xl border border-line bg-slate-900 px-3 py-2 text-sm outline-none focus:border-glow"
        />
        <button
          type="submit"
          className="rounded-xl bg-glow px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default memo(ChatPanel);
