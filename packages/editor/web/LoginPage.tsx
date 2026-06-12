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

  return (
    <main className="scroll" style={{ height: "100%" }}>
      <div className="page">
        <div className="signin login-card">
          <a className="brand" href="/"><img src="/favicon.svg" alt="Kymostudio" /></a>
          <h1>Sign in</h1>
          <p className="muted">Phiên đăng nhập đã hết hạn hoặc bạn chưa đăng nhập.<br />Sign in with Google to continue.</p>
          <GoogleButton />
        </div>
      </div>
    </main>
  );
}
