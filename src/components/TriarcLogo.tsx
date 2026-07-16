import { motion } from 'motion/react';

interface TriarcLogoProps {
  className?: string;
  size?: number;
  animate?: boolean;
  hideText?: boolean;
}

export default function TriarcLogo({ className = '', size = 200, animate = true, hideText = false }: TriarcLogoProps) {
  const finalHeight = hideText ? size * 0.82 : size * 0.95;
  const finalViewBox = hideText ? "0 0 500 410" : "0 0 500 480";

  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      <motion.svg
        width={size}
        height={finalHeight}
        viewBox={finalViewBox}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        initial={animate ? { scale: 0.95, opacity: 0 } : false}
        animate={animate ? { scale: 1, opacity: 1 } : false}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="drop-shadow-[0_0_25px_rgba(234,179,8,0.4)]"
      >
        <defs>
          {/* Polished Gold Gradients for Metallic Effect */}
          <linearGradient id="gold-primary" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#78350f" /> {/* Deep Bronze */}
            <stop offset="25%" stopColor="#d97706" /> {/* Warm Gold */}
            <stop offset="50%" stopColor="#fef08a" /> {/* Liquid Metallic Highlight */}
            <stop offset="75%" stopColor="#ca8a04" /> {/* Deep Gold */}
            <stop offset="100%" stopColor="#fef08a" /> {/* Edge Highlight */}
          </linearGradient>

          <linearGradient id="gold-metal-light" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="35%" stopColor="#eab308" />
            <stop offset="70%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#fef08a" />
          </linearGradient>

          <linearGradient id="gold-dark-accent" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ca8a04" />
            <stop offset="50%" stopColor="#451a03" />
            <stop offset="100%" stopColor="#0c0a09" />
          </linearGradient>

          {/* Lettering Gold Gradient */}
          <linearGradient id="gold-text" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="40%" stopColor="#eab308" />
            <stop offset="75%" stopColor="#ca8a04" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>

          {/* Precise Facet Clip Paths to ensure seamless joints */}
          <clipPath id="clip-left-facet">
            <polygon points="250,15 250,165 150,320 15,400" />
          </clipPath>
          <clipPath id="clip-right-facet">
            <polygon points="250,15 485,400 350,320 250,165" />
          </clipPath>
          <clipPath id="clip-bottom-facet">
            <polygon points="15,400 150,320 350,320 485,400" />
          </clipPath>
        </defs>

        {/* ========================================== */}
        {/* TRIANGLE LOGO EMBLEM                       */}
        {/* ========================================== */}

        {/* Background Base Plate (Black backing keeps the logo readable even on transparent/light backgrounds) */}
        <polygon
          points="250,15 485,400 15,400"
          fill="#000000"
        />

        {/* 1. Left Facet: Fine, dense diagonal hatching lines */}
        <g clipPath="url(#clip-left-facet)">
          {Array.from({ length: 32 }).map((_, i) => {
            const offset = -220 + i * 15;
            return (
              <line
                key={`left-hatch-${i}`}
                x1={-50}
                y1={-50 + offset}
                x2={550}
                y2={550 + offset}
                stroke="url(#gold-primary)"
                strokeWidth="3"
                strokeLinecap="round"
              />
            );
          })}
        </g>

        {/* 2. Right Facet: Bold parallel longitudinal slats */}
        <g clipPath="url(#clip-right-facet)">
          {Array.from({ length: 6 }).map((_, i) => {
            const offset = -150 + i * 26;
            return (
              <line
                key={`right-band-${i}`}
                x1={250 + offset}
                y1={15}
                x2={485 + offset}
                y2={400}
                stroke="url(#gold-metal-light)"
                strokeWidth="11"
                strokeLinecap="butt"
              />
            );
          })}
        </g>

        {/* 3. Bottom Facet: parallel horizontal slats */}
        <g clipPath="url(#clip-bottom-facet)">
          {Array.from({ length: 6 }).map((_, i) => {
            const y_offset = i * 14;
            return (
              <line
                key={`bottom-band-${i}`}
                x1={0}
                y1={400 - y_offset}
                x2={500}
                y2={400 - y_offset}
                stroke="url(#gold-primary)"
                strokeWidth="8"
              />
            );
          })}
        </g>

        {/* 4. Outer Solid Gold Border with sharp rounded corners */}
        <polygon
          points="250,15 485,400 15,400"
          stroke="url(#gold-primary)"
          strokeWidth="10"
          strokeLinejoin="round"
          fill="none"
        />

        {/* 5. Inner Separation Ring (Sharp black divider) */}
        <polygon
          points="250,30 468,388 32,388"
          stroke="#000000"
          strokeWidth="5"
          strokeLinejoin="round"
          fill="none"
        />

        {/* 6. Solid Core Black Center Triangle */}
        <polygon
          points="250,165 350,312 150,312"
          fill="#000000"
          stroke="url(#gold-primary)"
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* Golden ambient frame highlight inside core center */}
        <polygon
          points="250,175 338,304 162,304"
          stroke="url(#gold-metal-light)"
          strokeWidth="1"
          fill="none"
        />

        {/* Decorative Golden Outer Pulse Animation */}
        <motion.polygon
          points="250,15 485,400 15,400"
          stroke="url(#gold-primary)"
          strokeWidth="1"
          strokeLinejoin="round"
          fill="none"
          initial={{ opacity: 0.1 }}
          animate={{ opacity: [0.1, 0.4, 0.1], scale: [1, 1.01, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{ originX: "250px", originY: "240px" }}
        />

        {/* ========================================== */}
        {/* GEOMETRIC FUTURISTIC "TRI4RC" LETTERING    */}
        {/* ========================================== */}
        {!hideText && (
          <g id="letters-group" fill="url(#gold-text)" stroke="#000000" strokeWidth="2" strokeLinejoin="miter">
            
            {/* T (Chamfered Top) */}
            <path d="M 60,428 L 66,422 H 106 L 112,428 V 434 H 93 V 472 H 79 V 434 H 60 Z" />
            <path d="M 62,429 L 67,424 H 105 L 110,429 V 432 H 91 V 470 H 81 V 432 H 62 Z" fill="#fff5cc" opacity="0.25" stroke="none" />

            {/* R (Bold, angled look) */}
            <path d="M 125,422 H 170 C 179,422 184,427 184,435 C 184,444 179,448 170,448 H 140 V 472 H 125 Z M 140,432 H 168 C 171,432 172,433 172,435 C 172,437 171,438 168,438 H 140 Z M 146,448 L 180,472 H 164 L 138,452 V 448 Z" />
            <path d="M 127,424 H 168 C 174,424 177,427 177,435 C 177,441 174,444 168,444 H 138 V 470 H 127 Z" fill="#fff5cc" opacity="0.15" stroke="none" />

            {/* I (Geometric Column) */}
            <path d="M 197,422 H 211 V 472 H 197 Z" />
            <path d="M 199,424 H 209 V 470 H 199 Z" fill="#fff5cc" opacity="0.25" stroke="none" />

            {/* 4 / A (A stylized as a high-tech "4") */}
            <path d="M 244,422 H 268 V 472 H 252 V 448 H 230 L 222,472 H 206 L 234,422 Z M 252,436 L 240,448 H 252 Z" fillRule="evenodd" />
            <path d="M 244,424 H 266 V 470 H 254 V 446 H 232 L 224,470 H 208 L 236,424 Z" fill="#fff5cc" opacity="0.15" stroke="none" />

            {/* R (Second R matching) */}
            <path d="M 296,422 H 341 C 350,422 355,427 355,435 C 355,444 350,448 341,448 H 311 V 472 H 296 Z M 311,432 H 339 C 342,432 343,433 343,435 C 343,437 342,438 339,438 H 311 Z M 317,448 L 351,472 H 335 L 309,452 V 448 Z" />
            <path d="M 298,424 H 339 C 345,424 348,427 348,435 C 348,441 345,444 339,444 H 309 V 470 H 298 Z" fill="#fff5cc" opacity="0.15" stroke="none" />

            {/* C (Angled Chamfered Corners) */}
            <path d="M 416,422 H 378 L 364,436 V 458 L 378,472 H 416 V 460 H 384 V 434 H 416 Z" />
            <path d="M 414,424 H 380 L 368,436 V 458 L 380,470 H 414 V 458 H 386 V 436 H 414 Z" fill="#fff5cc" opacity="0.15" stroke="none" />

          </g>
        )}
      </motion.svg>
    </div>
  );
}
