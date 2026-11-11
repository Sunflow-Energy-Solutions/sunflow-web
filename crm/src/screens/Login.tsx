import { useState } from "react";
import { Button, Field, Input } from "../components/ui";
import { supabase } from "../cloud";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setErr(error.message === "Invalid login credentials" ? "That email or password isn't right." : error.message);
    setBusy(false);
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-navy-900 px-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <img src="/icon-192.png" alt="" className="mx-auto mb-3 size-16 rounded-2xl" />
        <h1 className="text-center text-2xl font-extrabold">Sunflow CRM</h1>
        <p className="mb-5 text-center text-sm text-mist-500">Sign in with your staff account</p>
        <div className="space-y-3.5">
          <Field label="Email"><Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoCapitalize="off" /></Field>
          <Field label="Password"><Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
          {err && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{err}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</Button>
        </div>
      </form>
    </div>
  );
}
