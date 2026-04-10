import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SupportPage() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText("satyabhaskar69@nyes");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-cyan-500/10 bg-slate-950/80 px-4 py-4 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-800 transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 className="text-xl font-bold text-white tracking-wide">Elite Patron Lounge</h1>
        </div>
        <button
          onClick={() => navigate("/")}
          className="rounded-lg bg-cyan-600 px-5 py-2 font-bold flex items-center gap-2 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 hover:bg-cyan-500"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="currentColor" 
            className="h-5 w-5"
          >
            <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
          </svg>
          Enter the Arena
        </button>
      </header>

      {/* Main Content */}
      <main className="mx-auto mt-10 max-w-3xl px-4 sm:px-6 mb-20 flex flex-col items-center flex-1">
        
        {/* Heart Icon */}
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-cyan-900/40 border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] ring-4 ring-cyan-950">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-cyan-400"
          >
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
          </svg>
        </div>

        {/* Headings */}
        <h2 className="mb-10 text-center text-3xl sm:text-4xl font-black tracking-tight text-white">
          Fuel The Next Feature Drop
        </h2>

        {/* Support Card */}
        <div className="w-full rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-slate-900/90 to-slate-900 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          {/* subtle glow background */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-cyan-600/10 blur-3xl pointer-events-none"></div>

          <div className="flex items-center gap-4 mb-8">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="32" 
              height="32" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="text-cyan-400"
            >
              <rect x="2" y="3" width="20" height="6" rx="2" ry="2" />
              <rect x="2" y="15" width="20" height="6" rx="2" ry="2" />
              <line x1="6" y1="6" x2="6.01" y2="6" strokeWidth="3" />
              <line x1="6" y1="18" x2="6.01" y2="18" strokeWidth="3" />
            </svg>
            <h3 className="text-2xl font-bold text-white tracking-tight">Keep the Hammer Falling</h3>
          </div>

          <div className="space-y-6 text-slate-300 leading-relaxed text-[1.05rem]">
            <p>Hello Franchise Owners! 🏏</p>
            <p>
              We built the IPL Auction Game purely out of a passion for cricket strategy and the intense thrill of the auction table. If this tool has made your draft nights more exciting, consider dropping a tip in our jar!
            </p>
            <p>Your direct contribution completely empowers us to:</p>
            <ul className="space-y-3 pl-2">
              <li className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500"></span>
                Maintain low-latency, high-performance live socket servers
              </li>
              <li className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500"></span>
                Build highly-requested logic (like Retentions or Deep Stats)
              </li>
              <li className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500"></span>
                Scale up database capacity for massive active rooms
              </li>
              <li className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500"></span>
                Ensure the core competitive experience stays incredibly fast
              </li>
            </ul>
            <p className="pt-4 font-bold text-cyan-400">
              Thanks for battling it out in the arena! 🏆
            </p>
          </div>

        </div>

        {/* QR Code Block */}
        <div className="w-full mt-6 mb-12 rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-slate-900/40 to-slate-900/80 p-6 pb-10 shadow-xl flex flex-col items-center justify-center overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
          
          <h3 className="text-xl font-bold text-white mb-6 tracking-wide drop-shadow-sm flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            Direct Support via QR
          </h3>
          
          <div className="mx-auto w-full max-w-[320px] h-[340px] overflow-hidden rounded-2xl border-2 border-slate-700/60 shadow-2xl transition-transform hover:-translate-y-1 bg-[#121212] relative">
            {/* The user's uploaded QR component will render here. We use scale and object-position mapping to crop out top and bottom. */}
            <img 
              src="/qr.jpg" 
              alt="Scan & Pay PhonePe QR" 
              className="absolute top-1/2 left-1/2 w-[360px] max-w-none transform -translate-x-1/2 -translate-y-[54%]"
              onError={(e) => { 
                e.currentTarget.style.display = 'none'; 
                e.currentTarget.nextElementSibling.style.display = 'flex'; 
              }} 
            />
            {/* Fallback state explaining where to drop the image if not found */}
            <div style={{ display: 'none' }} className="h-80 flex-col items-center justify-center p-8 text-slate-400 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-40"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
              <p className="text-base font-bold text-white mb-2">QR Code Missing</p>
              <p className="text-sm leading-relaxed">
                Please rename your PhonePe screenshot to <code className="text-emerald-400 bg-emerald-900/30 px-1 py-0.5 rounded">qr.jpg</code> and place it inside your project's <code className="text-cyan-400 bg-cyan-900/30 px-1 py-0.5 rounded">public/</code> folder for it to appear here.
              </p>
            </div>
          </div>

          {/* UPI ID Copy Block */}
          <div className="mt-8 flex flex-col items-center">
             <p className="text-slate-400 text-sm mb-3 font-medium">Or pay directly using UPI ID:</p>
             <button 
                onClick={handleCopy}
                className="relative flex items-center gap-3 bg-slate-800/60 hover:bg-slate-700/80 border border-slate-600 px-6 py-3 rounded-xl transition-all active:scale-95 group shadow-lg"
             >
                <span className="font-mono text-cyan-300 font-bold tracking-wide text-[1.05rem]">satyabhaskar69@nyes</span>
                {copied ? (
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><polyline points="20 6 9 17 4 12"></polyline></svg>
                ) : (
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-cyan-400 transition-colors"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                )}
                {copied && <span className="absolute -top-10 right-0 text-xs text-white font-bold bg-emerald-500 shadow-xl shadow-emerald-500/20 px-3 py-1 rounded-full animate-bounce">Copied!</span>}
             </button>
          </div>
        </div>

        {/* Mobile Deep Link Button */}
        <div className="w-full flex justify-center mt-2 mb-20 px-4">
           <a 
              href="upi://pay?pa=satyabhaskar69@nyes&cu=INR"
              className="group relative inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 px-8 py-4 font-extrabold text-white shadow-xl shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-95 w-full sm:max-w-sm overflow-hidden"
           >
              {/* Shine effect */}
              <span className="absolute left-[-10%] top-[-150%] h-[400%] w-12 rotate-[35deg] bg-white/20 transition-all duration-700 ease-out group-hover:translate-x-[400px] pointer-events-none"></span>
              
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 3h12"/>
                <path d="M6 8h12"/>
                <path d="m6 13 8.5 8L15 21"/>
                <path d="M6 13h3"/>
                <path d="M9 13c6.667 0 6.667-10 0-10"/>
              </svg>
              Pay Now via UPI App
           </a>
        </div>
      </main>
    </div>
  );
}
