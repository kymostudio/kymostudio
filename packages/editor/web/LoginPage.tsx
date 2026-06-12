import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, GoogleButton } from "./auth";

// Sign-in page: /diagrams (and anything else auth-walled) redirects here with
// ?next=<path>; once GIS hands back a token we bounce straight to it.
export default function LoginPage() {
  const { claims } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const raw = params.get("next") || "/diagrams";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/diagrams"; // same-app paths only

  useEffect(() => { document.title = "Sign in · Kymostudio"; return () => { document.title = "Kymostudio"; }; }, []);
  useEffect(() => { if (claims) navigate(next, { replace: true }); }, [claims, next, navigate]);
  // One Tap is contextual: this page is where the user intends to sign in.
  useEffect(() => {
    const t = setTimeout(() => (window as any).google?.accounts?.id?.prompt(), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <main className="scroll" style={{ height: "100%" }}>
      <div className="page">
        <div className="signin login-card">
          <a className="brand" href="/"><img src="/logo.svg" alt="Kymostudio" /></a>
          <h1>Sign in</h1>
          <p className="muted">Your session has expired or you're not signed in.<br />Sign in with Google to continue.</p>
          <GoogleButton />
        </div>
      </div>
    </main>
  );
}
