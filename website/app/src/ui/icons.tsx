/**
 * ui/icons.tsx — canvas-studio icon set (FR-CS-02+).
 *
 * A small, hand-rolled stroke-icon set ported from the hi-fi prototype's
 * `icons.jsx` (kymo-style: 24×24, 1.6 stroke, round caps/joins). Zero deps
 * (`NFR-CS-04`). Each icon takes `{ size }` plus any SVG props; colour follows
 * `currentColor` so the chrome's token colours drive it. P3's tool rail reuses
 * this module — add icons here as later phases need them.
 */
type IconProps = { size?: number } & Omit<React.SVGProps<SVGSVGElement>, "children">;

const Svg = ({ size = 16, children, ...rest }: IconProps & { children: React.ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    {children}
  </svg>
);

export const Undo = (p: IconProps) => (
  <Svg {...p}><path d="M9 14l-5-5 5-5" /><path d="M4 9h11a5 5 0 010 10h-3" /></Svg>
);
export const Redo = (p: IconProps) => (
  <Svg {...p}><path d="M15 14l5-5-5-5" /><path d="M20 9H9a5 5 0 000 10h3" /></Svg>
);
export const Sun = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" />
  </Svg>
);
export const Moon = (p: IconProps) => (
  <Svg {...p}><path d="M20 14.5A8 8 0 119.5 4a6.5 6.5 0 0010.5 10.5z" /></Svg>
);
export const Download = (p: IconProps) => (
  <Svg {...p}><path d="M12 4v12M6 12l6 6 6-6M4 20h16" /></Svg>
);
export const Share = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
  </Svg>
);
export const Code = (p: IconProps) => (
  <Svg {...p}><path d="M8 7l-5 5 5 5" /><path d="M16 7l5 5-5 5" /><path d="M14 5l-4 14" /></Svg>
);
export const Play = (p: IconProps) => (
  <Svg {...p}><path d="M7 5l12 7-12 7z" fill="currentColor" /></Svg>
);
export const Comment = (p: IconProps) => (
  <Svg {...p}><path d="M21 12c0 4.4-4 8-9 8-1.4 0-2.8-.3-4-.8L3 21l1.5-4C3.6 15.6 3 13.9 3 12c0-4.4 4-8 9-8s9 3.6 9 8z" /></Svg>
);
export const Layers = (p: IconProps) => (
  <Svg {...p}><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 12l9 5 9-5" /><path d="M3 16l9 5 9-5" /></Svg>
);
export const Chevron = (p: IconProps) => (
  <Svg {...p}><path d="M9 6l6 6-6 6" /></Svg>
);
export const ChevronDown = (p: IconProps) => (
  <Svg {...p}><path d="M6 9l6 6 6-6" /></Svg>
);
export const Folder = (p: IconProps) => (
  <Svg {...p}><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></Svg>
);
export const StarFill = (p: IconProps) => (
  <Svg {...p}><path d="M12 3l2.7 6 6.3.5-4.8 4.2 1.5 6.3L12 16.8 6.3 20l1.5-6.3L3 9.5 9.3 9z" fill="currentColor" /></Svg>
);
export const Dots = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="5" cy="12" r="1.4" fill="currentColor" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    <circle cx="19" cy="12" r="1.4" fill="currentColor" />
  </Svg>
);
