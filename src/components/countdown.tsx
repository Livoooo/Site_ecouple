"use client";

import { useSyncExternalStore } from "react";

const START_DATE = new Date("2026-08-27T00:00:00").getTime();
const START_COUNT = 199;

function subscribe() {
  return () => {};
}

function getSnapshot() {
  const daysElapsed = Math.floor((Date.now() - START_DATE) / 86_400_000);
  return Math.max(START_COUNT - daysElapsed, 0);
}

// Pas de valeur au rendu serveur : le serveur et le navigateur peuvent être
// dans des fuseaux horaires différents, donc on n'affiche le compteur
// qu'une fois hydraté côté client.
function getServerSnapshot() {
  return null;
}

export default function Countdown() {
  const count = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (count === null) return null;

  return (
    <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
      {count}
    </span>
  );
}
