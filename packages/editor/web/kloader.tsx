import React from "react";

// kymo brand loader (the animated "K"). Used for the full-screen boot splash on
// first load while the project's data arrives. Pane-level loading (code/preview)
// uses the slimmer VS Code-style progress bar instead.
export function KLoader() {
  return (
    <div className="kloader" role="img" aria-label="Loading">
      <div className="k1">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <line x1="33" y1="26.5" x2="33" y2="73.5" stroke="#fff" strokeWidth="11.5" strokeLinecap="round" />
          <circle cx="33" cy="26.5" r="5.8" fill="#fff" /><circle cx="33" cy="26.5" r="2.44" fill="#e0095f" />
          <circle cx="33" cy="73.5" r="5.8" fill="#fff" /><circle cx="33" cy="73.5" r="2.44" fill="#e0095f" />
        </svg>
      </div>
      <div className="k2">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <line x1="65.5" y1="27" x2="34" y2="58.5" stroke="#fff" strokeWidth="11.5" strokeLinecap="round" />
          <circle cx="65.5" cy="27" r="5.8" fill="#fff" /><circle cx="65.5" cy="27" r="2.44" fill="#e0095f" />
          <circle cx="34" cy="58.5" r="5.8" fill="#fff" /><circle cx="34" cy="58.5" r="2.44" fill="#e0095f" />
        </svg>
      </div>
      <div className="k3">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <line x1="48" y1="49.5" x2="67" y2="73" stroke="#fff" strokeWidth="11.5" strokeLinecap="round" />
          <circle cx="48" cy="49.5" r="5.8" fill="#fff" /><circle cx="48" cy="49.5" r="2.44" fill="#e0095f" />
          <circle cx="67" cy="73" r="5.8" fill="#fff" /><circle cx="67" cy="73" r="2.44" fill="#e0095f" />
        </svg>
      </div>
    </div>
  );
}
