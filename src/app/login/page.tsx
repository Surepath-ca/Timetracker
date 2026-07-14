"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestOtp(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setStep("code");
      setNotice(`We sent a 6-digit code to ${email.trim().toLowerCase()}.`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      router.push("/tracker");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="h-1 w-full bg-surepath-500" />
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <Logo className="h-11" showTagline />
          </div>

          <div className="card p-8">
            <h1 className="text-xl font-semibold text-surepath-800">
              {step === "email" ? "Employee Sign-In" : "Enter verification code"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {step === "email"
                ? "Access is restricted to SurePath Valuation & Advisory personnel."
                : notice || "Check your inbox for the code."}
            </p>

            {step === "email" ? (
              <form onSubmit={requestOtp} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="email" className="label">
                    Work email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    className="input"
                    placeholder="you@surepathvaluation.ca"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button type="submit" disabled={busy} className="btn-primary w-full">
                  {busy ? "Sending code…" : "Send sign-in code"}
                </button>
              </form>
            ) : (
              <form onSubmit={verifyOtp} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="code" className="label">
                    6-digit code
                  </label>
                  <input
                    id="code"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    required
                    autoFocus
                    className="input text-center text-2xl tracking-[0.5em]"
                    placeholder="••••••"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={busy || code.length !== 6}
                  className="btn-primary w-full"
                >
                  {busy ? "Verifying…" : "Verify & sign in"}
                </button>
                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    className="text-surepath-600 hover:underline"
                    onClick={() => {
                      setStep("email");
                      setCode("");
                      setError("");
                    }}
                  >
                    Use a different email
                  </button>
                  <button
                    type="button"
                    className="text-surepath-600 hover:underline"
                    disabled={busy}
                    onClick={() => requestOtp()}
                  >
                    Resend code
                  </button>
                </div>
              </form>
            )}
          </div>

          <p className="mt-8 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} SurePath Valuation &amp; Advisory Professional Corporation
          </p>
        </div>
      </div>
    </div>
  );
}
