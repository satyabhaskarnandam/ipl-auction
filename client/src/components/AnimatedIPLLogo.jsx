import "./AnimatedIPLLogo.css";

export default function AnimatedIPLLogo() {
  return (
    <div className="animated-logo-container">
      <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        className="animated-logo"
      >
        {/* Bat - sleek design */}
        <g transform="rotate(-45 50 50)">
          {/* Bat blade - tapered */}
          <path
            d="M 47 15 L 53 15 L 54 40 L 46 40 Z"
            fill="#E8D5B7"
            stroke="#8B6F47"
            strokeWidth="0.5"
          />
          {/* Bat edges highlight */}
          <line x1="47.5" y1="15" x2="48" y2="40" stroke="#F5DEB3" strokeWidth="0.3" opacity="0.8" />
          {/* Handle */}
          <rect x="47.5" y="40" width="5" height="18" fill="#6B4423" rx="2.5" />
          {/* Handle grip lines */}
          <line x1="47.5" y1="44" x2="52.5" y2="44" stroke="#4A2C17" strokeWidth="0.5" opacity="0.6" />
          <line x1="47.5" y1="48" x2="52.5" y2="48" stroke="#4A2C17" strokeWidth="0.5" opacity="0.6" />
          <line x1="47.5" y1="52" x2="52.5" y2="52" stroke="#4A2C17" strokeWidth="0.5" opacity="0.6" />
        </g>

        {/* Ball */}
        <circle cx="60" cy="35" r="12" fill="#FFFFFF" stroke="#D0D0D0" strokeWidth="0.8" />
        {/* Ball highlight */}
        <circle cx="62" cy="33" r="3" fill="#F5F5F5" opacity="0.8" />
        {/* Threading seam - two straight, close center lines */}
        <line x1="48" y1="34.2" x2="72" y2="34.2" stroke="#333333" strokeWidth="0.45" strokeLinecap="round" strokeDasharray="0.4 1.1" />
        <line x1="48" y1="35.8" x2="72" y2="35.8" stroke="#333333" strokeWidth="0.45" strokeLinecap="round" strokeDasharray="0.4 1.1" />

      </svg>
    </div>
  );
}
