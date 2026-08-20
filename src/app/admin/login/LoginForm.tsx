"use client";

import { useActionState } from "react";
import { signIn } from "../actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(signIn, "");

  return (
    <form action={action}>
      <label className="field-label" htmlFor="password">
        Password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        className="field-input mt-2"
        autoComplete="current-password"
        required
      />
      {error ? (
        <p className="mt-3 border-l-2 border-madder pl-3 text-sm text-madder">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn mt-6 w-full" disabled={pending}>
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
