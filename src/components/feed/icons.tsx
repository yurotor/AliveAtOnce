/** Small stroke icons for the card UI. 24×24, currentColor. */
type P = { className?: string };
const base = {
  width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true,
};

export const ChevronUp = ({ className }: P) => <svg {...base} className={className}><path d="M6 15l6-6 6 6" /></svg>;
export const ChevronDown = ({ className }: P) => <svg {...base} className={className}><path d="M6 9l6 6 6-6" /></svg>;
export const ChevronLeft = ({ className }: P) => <svg {...base} className={className}><path d="M15 6l-6 6 6 6" /></svg>;
export const ChevronRight = ({ className }: P) => <svg {...base} className={className}><path d="M9 6l6 6-6 6" /></svg>;
export const ShareIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6" /></svg>
);
export const MenuIcon = ({ className }: P) => <svg {...base} className={className}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
export const CloseIcon = ({ className }: P) => <svg {...base} className={className}><path d="M6 6l12 12M18 6L6 18" /></svg>;
export const LinkIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M10 14a4 4 0 005.66 0l3-3a4 4 0 00-5.66-5.66l-1 1" />
    <path d="M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l1-1" />
  </svg>
);
export const WhatsAppIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M4 20l1.3-4A8 8 0 1112 20a8 8 0 01-4-1.1L4 20z" />
    <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8c-1-.4-1.8-1.2-2.2-2.2l.8-1-1-2L9 9.5z" />
  </svg>
);
export const TikTokIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M14 3v11.5a3.5 3.5 0 11-3.5-3.5" />
    <path d="M14 3c.5 2.5 2.2 4 5 4.3" />
  </svg>
);
export const InstagramIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
  </svg>
);
