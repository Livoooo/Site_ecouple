import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, createSessionToken, isCorrectPassword } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const nextPath = params.next && params.next.startsWith("/") ? params.next : "/";

  async function login(formData: FormData) {
    "use server";

    const password = formData.get("password");
    const redirectTarget = nextPath;

    if (typeof password !== "string" || !isCorrectPassword(password)) {
      const query = new URLSearchParams({ error: "1" });
      if (redirectTarget !== "/") query.set("next", redirectTarget);
      redirect(`/login?${query.toString()}`);
    }

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, await createSessionToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    redirect(redirectTarget);
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <form
        action={login}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-black/10 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-950"
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Watch Party
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Entre le mot de passe pour rejoindre la room.
          </p>
        </div>
        <input
          type="password"
          name="password"
          placeholder="Mot de passe"
          required
          autoFocus
          className="rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-white/10 dark:text-zinc-50"
        />
        {params.error && (
          <p className="text-sm text-red-500">Mot de passe incorrect.</p>
        )}
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Entrer
        </button>
      </form>
    </div>
  );
}
