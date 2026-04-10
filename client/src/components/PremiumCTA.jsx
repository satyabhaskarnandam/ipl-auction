import React from 'react';

const PremiumCTA = () => {
  return (
    <div className="w-full mt-16 mb-24 px-4 animate-fade-in-up opacity-0 [animation-fill-mode:forwards]">
      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[2.5rem] border border-cyan-500/20 bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 shadow-2xl animate-float">
        
        <div className="relative z-10 flex flex-col items-center px-8 py-14 text-center sm:px-16">
          <div className="mb-6 flex items-center justify-center icon-3d-btn icon-3d-cyan icon-3d-signal translate-y-4">
             <span className="text-3xl animate-[spin_8s_linear_infinite]">⏳</span>
          </div>

          <h2 className="text-3xl font-black uppercase tracking-tighter text-white sm:text-5xl lg:text-5xl">
            Your Dream XI <span className="block mt-1 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Won’t Wait</span>
          </h2>

          <p className="mt-6 max-w-xl text-lg font-medium leading-relaxed text-slate-300 antialiased">
            Top players are getting sold fast. Enter the auction room now before your rivals steal your dream squad.
          </p>

          <div className="mt-10 group">
            <button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setTimeout(() => {
                  const input = document.querySelector('input');
                  if (input) input.focus();
                }, 400);
              }}
              className="relative flex items-center gap-3 overflow-hidden rounded-2xl bg-glow px-10 py-5 text-xl font-black transition-all duration-300 hover:scale-105 hover:brightness-110 active:scale-95"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
              
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="currentColor" 
                className="h-7 w-7 transition-transform group-hover:scale-110 group-hover:rotate-[-8deg] drop-shadow-md"
              >
                <path d="M14.7 12.5l5.8 5.8-2.1 2.1-5.8-5.8 2.1-2.1zM5 14h2l8-8-2-2-8 8v2zm-2 4h4l10-10-4-4L3 14v4zm16-16l3 3-3 3-3-3 3-3z" />
              </svg>
              
              START BIDDING NOW
            </button>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6">
             <div className="h-[1px] w-12 bg-white/10" />
             <span className="text-[10px] font-bold uppercase tracking-[.3em] text-cyan-400/60 antialiased">Tournament Standard · 100% Real-Time</span>
             <div className="h-[1px] w-12 bg-white/10" />
          </div>
        </div>

        {/* Gloss Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
      </div>
    </div>
  );
};

export default PremiumCTA;
