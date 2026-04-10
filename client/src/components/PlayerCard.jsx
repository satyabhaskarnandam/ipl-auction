import React from "react";
import { formatAmount } from "../lib/formatAmount";

const PlayerCard = React.memo(function PlayerCard({ player, currentSet, status, statusMessage, soldHighlightActive = false, hideWaitingText = false, goingOnce, goingTwice, actionButton = null }) {
  if (!player) {
    return (
      <div className="w-[380px] max-w-[92vw] rounded-3xl border border-line bg-panel p-3 text-center">
        {!hideWaitingText ? <p className="text-slate-300 text-sm">{statusMessage || "The Auction will begin shortly. Prepare your bids!"}</p> : <div className="h-5" />}
      </div>
    );
  }

  const isForeignPlayer = player.country && player.country !== "India";

  const isSold = status === "SOLD";
  const isUnsold = status === "UNSOLD";

  return (
    <div className={`relative w-[380px] max-w-[92vw] rounded-3xl border p-4 shadow-2xl transition-transform duration-200 ${isSold ? "border-emerald-400 ring-4 ring-emerald-400/60 bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900" : isUnsold ? "border-rose-400 ring-4 ring-rose-400/60 bg-gradient-to-br from-rose-900 via-red-900 to-slate-900" : "border-line bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900"} ${soldHighlightActive ? "border-emerald-400 ring-4 ring-emerald-400/60" : ""} ${player ? "animate-spotlight" : ""}`}>
      {(goingOnce || goingTwice) && (
        <div className="absolute -top-12 left-1/2 z-10 -translate-x-1/2">
          <span className="whitespace-nowrap rounded-full bg-red-500 px-5 py-1.5 text-base font-bold uppercase text-white animate-pulse drop-shadow-lg">
            {goingOnce ? "GOING ONCE" : "GOING TWICE"}
          </span>
        </div>
      )}
      <p className="text-xs uppercase tracking-widest text-blue-200">
        {currentSet?.setName || "Auction Set"}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">{player.name}</h2>
        {isForeignPlayer && (
          <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg">
            <span className="text-white font-bold text-xs">✈</span>
          </div>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-slate-800/70 p-3">
          <p className="text-slate-400">Role</p>
          <p className="font-semibold text-white">{player.role}</p>
        </div>
        <div className="rounded-xl bg-slate-800/70 p-3">
          <p className="text-slate-400">Country</p>
          <p className="font-semibold text-white">{player.country}</p>
        </div>
        <div className="rounded-xl bg-slate-800/70 p-3">
          <p className="text-slate-400">Base Price</p>
          <p className="font-semibold text-white">₹{formatAmount(player.basePrice)}</p>
        </div>
        <div className="rounded-xl bg-slate-800/70 p-3">
          <p className="text-slate-400">Status</p>
          <p className={`font-semibold ${isSold ? "text-green-400" : isUnsold ? "text-rose-400" : "text-cyan-300"}`}>{status}</p>
        </div>
      </div>
      {actionButton ? <div className="mt-4">{actionButton}</div> : null}
    </div>
  );
});

export default PlayerCard;
