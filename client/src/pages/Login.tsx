import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from "@/lib/firebase";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Login() {
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const utils = trpc.useUtils();

  const afterAuth = async () => {
    // The tRPC link reads the fresh Firebase ID token on the next request
    // (see main.tsx), so just invalidate `auth.me` and let it refetch.
    await utils.auth.me.invalidate();
    window.location.href = "/app";
  };

  const withGoogle = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
      await afterAuth();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signIn") await signInWithEmail(email, password);
      else await signUpWithEmail(email, password);
      await afterAuth();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-teal-700">
            <Sparkles className="h-4 w-4" />
          </span>
          <p className="text-sm font-bold text-[#071b2e]">MASS AI</p>
        </div>
        <h1 className="mt-4 text-xl font-bold tracking-tight text-[#071b2e]">
          {mode === "signIn" ? "Sign in" : "Create your account"}
        </h1>

        <Button
          type="button"
          onClick={withGoogle}
          disabled={busy}
          className="mt-5 w-full bg-[#0f766e] hover:bg-[#0b625c]"
        >
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Continue with Google
        </Button>

        <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />
          or
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <form onSubmit={submit} className="grid gap-3">
          <Input
            type="email"
            required
            placeholder="you@business.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            type="password"
            required
            minLength={6}
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button type="submit" variant="outline" disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {mode === "signIn" ? "Sign in with email" : "Create account"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
          className="mt-4 text-xs font-medium text-teal-700 underline"
        >
          {mode === "signIn" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
