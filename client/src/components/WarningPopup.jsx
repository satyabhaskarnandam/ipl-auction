import { useEffect, useState } from "react";

function WarningPopup({ message, onClose, soundEnabled = true }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      setIsAnimating(true);

      // Play warning sound
      if (soundEnabled) {
        try {
          const audio = new Audio('/sounds/warning.mp3');
          audio.volume = 0.3;
          audio.play().catch(() => {});
        } catch (e) {
          // Ignore audio errors
        }
      }

      // Auto close after 3 seconds
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setTimeout(() => {
          setIsVisible(false);
          onClose();
        }, 300);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [message, onClose, soundEnabled]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      <div
        className={`
          relative bg-red-900/95 border-2 border-red-500 rounded-2xl p-6 shadow-2xl
          transform transition-all duration-300 pointer-events-auto
          ${isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
        `}
        style={{
          boxShadow: '0 0 40px rgba(239, 68, 68, 0.3)',
          animation: isAnimating ? 'shake 0.5s ease-in-out, glow 2s ease-in-out infinite alternate' : 'none'
        }}
      >
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
              <span className="text-white text-2xl">⚠️</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg mb-1">Warning</h3>
            <p className="text-red-100 text-base">{message}</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        @keyframes glow {
          from { box-shadow: 0 0 20px rgba(239, 68, 68, 0.3); }
          to { box-shadow: 0 0 40px rgba(239, 68, 68, 0.6); }
        }
      `}</style>
    </div>
  );
}

export default WarningPopup;