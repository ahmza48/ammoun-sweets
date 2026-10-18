"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import { LogoMark } from "@/components/Logo";

const initial: LoginState = { status: "idle" };

/**
 * Admin sign-in form.
 *
 * Subtle brand (the mark, the green) but otherwise an operational screen —
 * per the brief, admin prioritises clarity over the shop's decoration.
 */
export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(login, initial);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-forest-900 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-4 text-center">
          <LogoMark size={44} className="text-gold-300" />
          <div>
            <h1 className="font-display text-[1.7rem] text-ivory">Ammoun Sweets</h1>
            <p className="mt-1 text-[0.85rem] text-cream/60">Staff sign in</p>
          </div>
        </div>

        <form
          action={formAction}
          className="mt-8 rounded-[var(--radius-lg-card)] border border-gold-400/20 bg-forest-950/60 p-6 backdrop-blur-sm"
        >
          {next ? <input type="hidden" name="next" value={next} /> : null}

          {state.status === "error" && state.message ? (
            <p
              role="alert"
              className="mb-5 rounded-[10px] border border-red-400/40 bg-red-500/10 px-4 py-3 text-[0.85rem] leading-relaxed text-red-200"
            >
              {state.message}
            </p>
          ) : null}

          <label htmlFor="email" className="block text-[0.72rem] font-semibold uppercase tracking-[0.15em] text-gold-400">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="username"
            autoFocus
            aria-invalid={Boolean(state.fieldErrors?.email)}
            className="mt-2 w-full rounded-[10px] border border-gold-400/25 bg-forest-900 px-4 py-3 text-[0.95rem] text-ivory placeholder:text-cream/30 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
          />

          <label htmlFor="password" className="mt-5 block text-[0.72rem] font-semibold uppercase tracking-[0.15em] text-gold-400">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            aria-invalid={Boolean(state.fieldErrors?.password)}
            className="mt-2 w-full rounded-[10px] border border-gold-400/25 bg-forest-900 px-4 py-3 text-[0.95rem] text-ivory focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
          />

          <button
            type="submit"
            disabled={pending}
            className="mt-7 w-full rounded-full bg-gold-400 px-6 py-3.5 text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-forest-900 transition-all duration-300 hover:bg-gold-300 disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="mt-5 text-center text-[0.75rem] leading-relaxed text-cream/40">
          Staff access only. Contact the shop owner if you need an account.
        </p>
      </div>
    </main>
  );
}
