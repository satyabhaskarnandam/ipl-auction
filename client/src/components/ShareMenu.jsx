import React, { useState, useRef, useEffect } from "react";

export default function ShareMenu({ roomId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef(null);

  const shareUrl = `${window.location.origin}/room/${roomId}`;
  const shareText = `Join my IPL Auction Room: ${roomId.toUpperCase()}`;

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setTimeout(() => setIsOpen(false), 2000);
    });
  };

  const shareLinks = [
    {
      name: "WhatsApp",
      url: `https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 overflow-visible">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
        </svg>
      )
    },
    {
      name: "Instagram",
      url: `https://www.instagram.com/`,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 overflow-visible">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      )
    },
    {
      name: "Twitter / X",
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 overflow-visible">
          <g transform="translate(1,0)">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.004 3.936H5.03z"/>
          </g>
        </svg>
      )
    },
    {
      name: "Telegram",
      url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 overflow-visible">
          <g transform="translate(0.5,0)">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </g>
        </svg>
      )
    },
    {
      name: "Facebook",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 overflow-visible">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      )
    }
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="icon-3d-btn icon-3d-cyan inline-flex h-11 w-11 items-center justify-center text-cyan-100"
        aria-label="Share invite link"
        title="Share invite link"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-6 w-6" fill="none">
          <defs>
            <linearGradient id="share-3d-node" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="55%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#155e75" />
            </linearGradient>
            <linearGradient id="share-3d-link" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#a5f3fc" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>
            <filter id="share-3d-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodColor="#082f49" floodOpacity="0.65" />
            </filter>
          </defs>
          <path d="M8.1 11.9 14.2 8.5M8.1 12.1l6.1 3.4" stroke="url(#share-3d-link)" strokeWidth="2.1" strokeLinecap="round" filter="url(#share-3d-shadow)" />
          <circle cx="6.4" cy="12" r="2.7" fill="url(#share-3d-node)" filter="url(#share-3d-shadow)" />
          <circle cx="16.8" cy="6.2" r="2.7" fill="url(#share-3d-node)" filter="url(#share-3d-shadow)" />
          <circle cx="16.8" cy="17.8" r="2.7" fill="url(#share-3d-node)" filter="url(#share-3d-shadow)" />
          <circle cx="5.8" cy="11.3" r="0.7" fill="#ffffff" opacity="0.35" />
          <circle cx="16.1" cy="5.5" r="0.7" fill="#ffffff" opacity="0.35" />
          <circle cx="16.1" cy="17.1" r="0.7" fill="#ffffff" opacity="0.35" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-3 rounded-2xl border border-cyan-500/30 bg-slate-900/95 backdrop-blur-md p-2 shadow-2xl z-50 flex items-center gap-1" style={{ minWidth: 'max-content', transform: 'translateX(8px)' }}>
          {shareLinks.map((link, idx) => {
            const colorClass = idx === 0 ? 'icon-3d-emerald' : idx === 1 ? 'icon-3d-rose' : idx === 2 ? 'icon-3d-cyan' : idx === 3 ? 'icon-3d-cyan' : 'icon-3d-cyan';
            const textColor = idx === 0 ? 'text-emerald-300' : idx === 1 ? 'text-rose-500' : idx === 2 ? 'text-white' : idx === 3 ? 'text-sky-400' : 'text-blue-600';
            return (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className={`icon-3d-btn origin-center ${colorClass} ${textColor} flex h-10 w-10 items-center justify-center rounded-xl transition-transform hover:scale-110 text-center p-1 overflow-visible`}
                title={`Share on ${link.name}`}
                aria-label={`Share on ${link.name}`}
              >
                <span className="flex items-center justify-center mx-auto my-auto">
                  {React.cloneElement(link.icon, { className: "w-5 h-5 overflow-visible mx-auto my-auto" })}
                </span>
              </a>
            );
          })}
          
          <div className="w-px h-6 bg-slate-700/80 mx-1"></div>
          
          <button
            onClick={handleCopyLink}
            className={`icon-3d-btn origin-center ${copied ? 'icon-3d-emerald text-emerald-300' : 'icon-3d-cyan text-cyan-300'} flex h-10 w-10 items-center justify-center rounded-xl transition-transform hover:scale-110`}
            title="Copy Link"
            aria-label="Copy Link"
          >
            <span className="flex items-center justify-center mx-auto my-auto">
              {copied ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-emerald-400 mx-auto my-auto">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-slate-300 mx-auto my-auto">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              )}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
