import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isSignedIn()) redirect("/admin");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <p className="rubric">Ottawa Majlis</p>
      <h1 className="mt-4 font-display text-4xl leading-tight">
        Sign in to the register.
      </h1>
      <div className="mt-8">
        <LoginForm />
      </div>
    </main>
  );
}
