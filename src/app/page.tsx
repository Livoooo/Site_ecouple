import Link from "next/link";
import Countdown from "@/components/countdown";

const PLACEHOLDER_TILES = [
  "J'travaille dessus mon amour",
  "J'travaille dessus mon amour",
  "J'travaille dessus mon amour",
];

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 p-6 dark:bg-black">
      <div className="absolute top-4 right-4">
        <Countdown />
      </div>
      <div className="grid w-full max-w-3xl grid-cols-2 gap-4">
        <Link
          href="/watch-party"
          className="relative flex aspect-video items-end overflow-hidden rounded-2xl border border-black/10 bg-cover bg-center shadow-sm dark:border-white/10"
          style={{ backgroundImage: "url(/wallpaper.jpg)" }}
        >
          <div className="w-full bg-gradient-to-t from-black/80 via-black/10 to-transparent p-4">
            <span className="text-base font-semibold text-white drop-shadow-md">
              Watch Party
            </span>
          </div>
        </Link>

        {PLACEHOLDER_TILES.map((label, i) => (
          <div
            key={i}
            className="flex aspect-video flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-black/10 bg-black/[.02] text-center dark:border-white/10 dark:bg-white/[.02]"
          >
            <span className="text-2xl opacity-50">💗</span>
            <span className="px-4 text-sm font-medium text-zinc-400 dark:text-zinc-500">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
