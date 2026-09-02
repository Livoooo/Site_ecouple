"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import PartySocket from "partysocket";
import { ICE_SERVERS } from "@/lib/ice-servers";
import type { ServerMessage, SignalingMessage } from "@/lib/messages";

const ROOM_NAME = "main";

type ChatMessage = { text: string; from: "moi" | "eux"; ts: number };
type StreamKind = "screen" | "webcam";

const CONNECTION_LABELS: Record<string, string> = {
  new: "en attente",
  connecting: "connexion...",
  connected: "connecté",
  disconnected: "déconnecté",
  failed: "échec de connexion",
  closed: "fermée",
};

function mediaErrorMessage(err: unknown) {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError") return "Permission refusée.";
    if (err.name === "NotFoundError") return "Aucune caméra/source trouvée.";
    if (err.name === "NotSupportedError")
      return "Non supporté par ce navigateur (il faut HTTPS ou localhost).";
  }
  return "Une erreur est survenue.";
}

export default function Room() {
  const [peerCount, setPeerCount] = useState(0);
  const [connectionState, setConnectionState] = useState<string | null>(null);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [isSharingWebcam, setIsSharingWebcam] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [remoteScreenActive, setRemoteScreenActive] = useState(false);
  const [remoteWebcamActive, setRemoteWebcamActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socketError, setSocketError] = useState<string | null>(null);
  const [iceConnectionState, setIceConnectionState] = useState<string | null>(null);
  const [localCandidateTypes, setLocalCandidateTypes] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");

  const socketRef = useRef<PartySocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const iceRestartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const myIdRef = useRef<string>(crypto.randomUUID());
  const peerIdRef = useRef<string | null>(null);
  const politeRef = useRef(true);
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);

  const localScreenStreamRef = useRef<MediaStream | null>(null);
  const localWebcamStreamRef = useRef<MediaStream | null>(null);

  const localScreenVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteScreenVideoRef = useRef<HTMLVideoElement | null>(null);
  const localWebcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteWebcamVideoRef = useRef<HTMLVideoElement | null>(null);

  // Un MediaStream distant peut arriver (ontrack) avant ou après le message
  // "stream-info" qui dit ce qu'il représente : on met en attente le premier
  // des deux arrivés jusqu'à ce que l'autre morceau soit là.
  const pendingStreamsRef = useRef(new Map<string, MediaStream>());
  const pendingKindsRef = useRef(
    new Map<string, { kind: StreamKind; active: boolean }>()
  );

  const send = useCallback((message: SignalingMessage) => {
    socketRef.current?.send(JSON.stringify(message));
  }, []);

  const applyRemoteStream = useCallback(
    (streamId: string, kind: StreamKind, active: boolean, stream?: MediaStream) => {
      const ref = kind === "screen" ? remoteScreenVideoRef : remoteWebcamVideoRef;
      const setActive = kind === "screen" ? setRemoteScreenActive : setRemoteWebcamActive;

      if (!active) {
        if (ref.current) ref.current.srcObject = null;
        setActive(false);
        pendingStreamsRef.current.delete(streamId);
        pendingKindsRef.current.delete(streamId);
        return;
      }

      if (stream && ref.current) {
        ref.current.srcObject = stream;
        setActive(true);
        pendingStreamsRef.current.delete(streamId);
        pendingKindsRef.current.delete(streamId);
      }
    },
    []
  );

  const renegotiate = useCallback(
    async (pc: RTCPeerConnection, options?: { iceRestart?: boolean }) => {
      try {
        makingOfferRef.current = true;
        const offer = await pc.createOffer(
          options?.iceRestart ? { iceRestart: true } : undefined
        );
        await pc.setLocalDescription(offer);
        send({ type: "webrtc-offer", sdp: pc.localDescription!.sdp! });
      } catch (err) {
        console.error("renegotiation failed", err);
      } finally {
        makingOfferRef.current = false;
      }
    },
    [send]
  );

  const ensurePeerConnection = useCallback(() => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        send({ type: "webrtc-ice", candidate: event.candidate.toJSON() });
        // Diagnostic temporaire : "relay" = passe par le serveur TURN
        // (nécessaire si NAT strict des deux côtés). Son absence quand la
        // connexion reste bloquée pointe vers un souci côté TURN plutôt que
        // WebRTC en général.
        const type = event.candidate.type;
        if (type) {
          setLocalCandidateTypes((prev) => (prev.includes(type) ? prev : [...prev, type]));
        }
      }
    };

    pc.oniceconnectionstatechange = () => {
      setIceConnectionState(pc.iceConnectionState);
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (!stream) return;

      const known = pendingKindsRef.current.get(stream.id);
      if (known) {
        applyRemoteStream(stream.id, known.kind, known.active, stream);
      } else {
        pendingStreamsRef.current.set(stream.id, stream);
      }
    };

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);

      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setRemoteScreenActive(false);
        setRemoteWebcamActive(false);
        // Coupure réseau passagère (wifi qui saute, changement de réseau...) :
        // on tente de rétablir la connexion tout seul via un ICE restart au
        // lieu d'obliger à recharger la page. Un court délai laisse une
        // chance à l'état de se rétablir de lui-même avant d'intervenir.
        if (iceRestartTimeoutRef.current) clearTimeout(iceRestartTimeoutRef.current);
        iceRestartTimeoutRef.current = setTimeout(() => {
          if (
            pcRef.current === pc &&
            (pc.connectionState === "disconnected" || pc.connectionState === "failed")
          ) {
            void renegotiate(pc, { iceRestart: true });
          }
        }, 2000);
      } else if (pc.connectionState === "closed") {
        setRemoteScreenActive(false);
        setRemoteWebcamActive(false);
      } else if (pc.connectionState === "connected" && iceRestartTimeoutRef.current) {
        clearTimeout(iceRestartTimeoutRef.current);
        iceRestartTimeoutRef.current = null;
      }
    };

    pcRef.current = pc;
    return pc;
  }, [applyRemoteStream, renegotiate, send]);

  const closePeerConnection = useCallback(() => {
    if (iceRestartTimeoutRef.current) {
      clearTimeout(iceRestartTimeoutRef.current);
      iceRestartTimeoutRef.current = null;
    }
    pcRef.current?.close();
    pcRef.current = null;
    setConnectionState(null);
    setIceConnectionState(null);
    setLocalCandidateTypes([]);
    setRemoteScreenActive(false);
    setRemoteWebcamActive(false);
    if (remoteScreenVideoRef.current) remoteScreenVideoRef.current.srcObject = null;
    if (remoteWebcamVideoRef.current) remoteWebcamVideoRef.current.srcObject = null;
    pendingStreamsRef.current.clear();
    pendingKindsRef.current.clear();
  }, []);

  // (Re)attache tous les flux locaux actifs à une connexion neuve, utile
  // quand l'autre personne se (re)connecte alors qu'on partage déjà quelque
  // chose.
  const attachLocalStreams = useCallback((pc: RTCPeerConnection) => {
    for (const stream of [localScreenStreamRef.current, localWebcamStreamRef.current]) {
      if (!stream) continue;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    }
  }, []);

  const announceLocalStreams = useCallback(() => {
    if (localScreenStreamRef.current) {
      send({
        type: "stream-info",
        streamId: localScreenStreamRef.current.id,
        kind: "screen",
        active: true,
      });
    }
    if (localWebcamStreamRef.current) {
      send({
        type: "stream-info",
        streamId: localWebcamStreamRef.current.id,
        kind: "webcam",
        active: true,
      });
    }
  }, [send]);

  const stopScreenShare = useCallback(() => {
    const stream = localScreenStreamRef.current;
    if (!stream) return;
    stream.getTracks().forEach((track) => {
      track.stop();
      const sender = pcRef.current?.getSenders().find((s) => s.track === track);
      if (sender) pcRef.current?.removeTrack(sender);
    });
    send({ type: "stream-info", streamId: stream.id, kind: "screen", active: false });
    localScreenStreamRef.current = null;
    if (localScreenVideoRef.current) localScreenVideoRef.current.srcObject = null;
    setIsSharingScreen(false);
    if (pcRef.current) void renegotiate(pcRef.current);
  }, [renegotiate, send]);

  const startScreenShare = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30, width: 1920, height: 1080 },
        audio: true,
      });

      localScreenStreamRef.current = stream;
      if (localScreenVideoRef.current) localScreenVideoRef.current.srcObject = stream;
      setIsSharingScreen(true);
      stream.getVideoTracks()[0].addEventListener("ended", stopScreenShare);

      const pc = ensurePeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      send({ type: "stream-info", streamId: stream.id, kind: "screen", active: true });
      await renegotiate(pc);
    } catch (err) {
      setError(`Partage d'écran impossible : ${mediaErrorMessage(err)}`);
    }
  }, [ensurePeerConnection, renegotiate, send, stopScreenShare]);

  const stopWebcam = useCallback(() => {
    const stream = localWebcamStreamRef.current;
    if (!stream) return;
    stream.getTracks().forEach((track) => {
      track.stop();
      const sender = pcRef.current?.getSenders().find((s) => s.track === track);
      if (sender) pcRef.current?.removeTrack(sender);
    });
    send({ type: "stream-info", streamId: stream.id, kind: "webcam", active: false });
    localWebcamStreamRef.current = null;
    if (localWebcamVideoRef.current) localWebcamVideoRef.current.srcObject = null;
    setIsSharingWebcam(false);
    setIsMicMuted(false);
    if (pcRef.current) void renegotiate(pcRef.current);
  }, [renegotiate, send]);

  const toggleMic = useCallback(() => {
    setIsMicMuted((muted) => {
      const nextMuted = !muted;
      localWebcamStreamRef.current
        ?.getAudioTracks()
        .forEach((track) => (track.enabled = !nextMuted));
      return nextMuted;
    });
  }, []);

  const startWebcam = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        // Micro activé par défaut : on peut ensuite le couper via le bouton
        // mute sans avoir à réactiver toute la webcam.
        audio: true,
      });

      localWebcamStreamRef.current = stream;
      setIsMicMuted(false);
      if (localWebcamVideoRef.current) localWebcamVideoRef.current.srcObject = stream;
      setIsSharingWebcam(true);
      stream.getVideoTracks()[0].addEventListener("ended", stopWebcam);

      const pc = ensurePeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      send({ type: "stream-info", streamId: stream.id, kind: "webcam", active: true });
      await renegotiate(pc);
    } catch (err) {
      setError(`Webcam impossible : ${mediaErrorMessage(err)}`);
    }
  }, [ensurePeerConnection, renegotiate, send, stopWebcam]);

  useEffect(() => {
    // React (Strict Mode, en dev) monte cet effet deux fois de suite. Sans
    // ce garde, l'ancienne socket recevrait encore des messages pendant sa
    // fermeture et écrirait dans les mêmes refs que la nouvelle, créant un
    // ping-pong de signaling entre les deux instances.
    let active = true;

    const socket = new PartySocket({
      host: process.env.NEXT_PUBLIC_PARTYKIT_SIGNALING_HOST!,
      room: ROOM_NAME,
    });
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      if (!active) return;
      setSocketError(null);
      send({ type: "hello", id: myIdRef.current });
    });

    // Diagnostic temporaire : PartySocket réessaie tout seul en cas d'échec,
    // mais on n'avait aucune visibilité sur la cause quand ça ne se
    // reconnecte jamais (mauvais host, serveur injoignable...).
    socket.addEventListener("close", (event) => {
      if (!active) return;
      setSocketError(
        `Signalisation déconnectée (code ${event.code}${event.reason ? " : " + event.reason : ""}), tentative de reconnexion...`
      );
    });
    socket.addEventListener("error", () => {
      if (!active) return;
      setSocketError("Erreur de connexion au serveur de signalisation.");
    });

    // Chaque message peut déclencher plusieurs `await` (setRemoteDescription,
    // createAnswer...). Sans sérialisation, deux messages arrivant coup sur
    // coup seraient traités par deux appels concurrents de ce handler, qui
    // liraient/modifieraient le même RTCPeerConnection en parallèle et
    // corrompraient la machine à états de la négociation SDP (d'où des
    // InvalidStateError en cascade). On chaîne donc leur traitement.
    let processingChain = Promise.resolve();

    const handleMessage = async (message: ServerMessage) => {
      switch (message.type) {
        case "peer-count":
          setPeerCount(message.count);
          if (message.count < 2) {
            peerIdRef.current = null;
            closePeerConnection();
          }
          break;

        case "hello": {
          const isNewPeer = peerIdRef.current !== message.id;
          peerIdRef.current = message.id;
          politeRef.current = myIdRef.current < message.id;

          if (isNewPeer) {
            // Renvoie notre id une seule fois, au cas où l'autre vient tout
            // juste de rejoindre et n'avait pas encore le nôtre. Ne PAS faire
            // ça inconditionnellement : ça créerait un ping-pong infini de
            // "hello" puisque l'autre côté ferait la même chose en retour.
            send({ type: "hello", id: myIdRef.current });
            closePeerConnection();
            if (localScreenStreamRef.current || localWebcamStreamRef.current) {
              const pc = ensurePeerConnection();
              attachLocalStreams(pc);
              announceLocalStreams();
              await renegotiate(pc);
            }
          }
          break;
        }

        case "webrtc-answer": {
          const pc = ensurePeerConnection();
          if (pc.signalingState !== "have-local-offer") {
            // Réponse à une offre déjà annulée par une renégociation plus
            // récente (collision de partage simultané côté WebRTC) : on
            // l'ignore silencieusement plutôt que de planter.
            break;
          }
          await pc.setRemoteDescription({ type: "answer", sdp: message.sdp });
          break;
        }

        case "webrtc-offer": {
          const pc = ensurePeerConnection();
          const description: RTCSessionDescriptionInit = {
            type: "offer",
            sdp: message.sdp,
          };

          const offerCollision =
            makingOfferRef.current || pc.signalingState !== "stable";

          ignoreOfferRef.current = !politeRef.current && offerCollision;
          if (ignoreOfferRef.current) break;

          if (offerCollision) {
            await pc.setLocalDescription({ type: "rollback" });
          }
          await pc.setRemoteDescription(description);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          send({ type: "webrtc-answer", sdp: pc.localDescription!.sdp! });
          break;
        }

        case "webrtc-ice": {
          try {
            await pcRef.current?.addIceCandidate(message.candidate);
          } catch (err) {
            if (!ignoreOfferRef.current) console.error(err);
          }
          break;
        }

        case "stream-info": {
          const pendingStream = pendingStreamsRef.current.get(message.streamId);
          if (pendingStream || !message.active) {
            applyRemoteStream(message.streamId, message.kind, message.active, pendingStream);
          } else {
            pendingKindsRef.current.set(message.streamId, {
              kind: message.kind,
              active: message.active,
            });
          }
          break;
        }

        case "chat":
          setMessages((prev) => [
            ...prev,
            { text: message.text, from: "eux", ts: message.ts },
          ]);
          break;
      }
    };

    socket.addEventListener("message", (event) => {
      if (!active) return;
      const message: ServerMessage = JSON.parse(event.data);
      processingChain = processingChain
        .catch(() => {}) // une erreur sur un message ne doit pas bloquer les suivants
        .then(() => (active ? handleMessage(message) : undefined))
        .catch((err) => console.error("signaling message failed", message.type, err));
    });

    return () => {
      active = false;
      socket.close();
      closePeerConnection();
      localScreenStreamRef.current?.getTracks().forEach((track) => track.stop());
      localWebcamStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const sendChat = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = draft.trim();
      if (!text) return;
      const ts = Date.now();
      send({ type: "chat", text, from: "moi", ts });
      setMessages((prev) => [...prev, { text, from: "moi", ts }]);
      setDraft("");
    },
    [draft, send]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:flex-row md:gap-6 md:overflow-visible md:p-6">
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              ← Accueil
            </Link>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Watch Party
            </h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
            {connectionState && (
              <span className="flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    connectionState === "connected"
                      ? "bg-green-500"
                      : connectionState === "failed" || connectionState === "disconnected"
                        ? "bg-red-500"
                        : "bg-amber-500"
                  }`}
                />
                {CONNECTION_LABELS[connectionState] ?? connectionState}
              </span>
            )}
            <span>
              {peerCount} personne{peerCount > 1 ? "s" : ""} connectée
              {peerCount > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
          <video
            ref={localScreenVideoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-contain ${isSharingScreen ? "" : "hidden"}`}
          />
          <video
            ref={remoteScreenVideoRef}
            autoPlay
            playsInline
            className={`h-full w-full object-contain ${isSharingScreen ? "hidden" : ""}`}
          />
          {!isSharingScreen && !remoteScreenActive && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-400">
              En attente d&apos;un flux partagé...
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {socketError && <p className="text-sm text-red-500">{socketError}</p>}
        <p className="text-xs text-zinc-400 dark:text-zinc-600">
          signaling host : {process.env.NEXT_PUBLIC_PARTYKIT_SIGNALING_HOST}
          {" · ice: "}
          {iceConnectionState ?? "—"}
          {" · candidats: "}
          {localCandidateTypes.length > 0 ? localCandidateTypes.join(", ") : "aucun"}
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={isSharingScreen ? stopScreenShare : startScreenShare}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isSharingScreen ? "Arrêter le partage" : "Partager mon écran"}
          </button>
          <button
            onClick={isSharingWebcam ? stopWebcam : startWebcam}
            className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-black/5 dark:border-white/10 dark:text-zinc-50 dark:hover:bg-white/10"
          >
            {isSharingWebcam ? "Couper ma webcam" : "Activer ma webcam"}
          </button>
          {isSharingWebcam && (
            <button
              onClick={toggleMic}
              aria-label={isMicMuted ? "Réactiver le micro" : "Couper le micro"}
              className="rounded-lg border border-black/10 px-3 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-black/5 dark:border-white/10 dark:text-zinc-50 dark:hover:bg-white/10"
            >
              {isMicMuted ? "🔇" : "🎤"}
            </button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 w-full flex-col gap-3 md:w-72">
        <div className="flex flex-col gap-2">
          <div
            className={`aspect-video w-full overflow-hidden rounded-lg bg-black ring-1 ring-white/10 ${
              isSharingWebcam ? "" : "hidden"
            }`}
          >
            <video
              ref={localWebcamVideoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          </div>
          <div
            className={`aspect-video w-full overflow-hidden rounded-lg bg-black ring-1 ring-white/10 ${
              remoteWebcamActive ? "" : "hidden"
            }`}
          >
            <video
              ref={remoteWebcamVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-black/10 dark:border-white/10">
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {messages.map((m) => (
              <div
                key={m.ts}
                className={`text-sm ${m.from === "moi" ? "text-right" : "text-left"}`}
              >
                <span
                  className={`inline-block rounded-lg px-2 py-1 ${
                    m.from === "moi"
                      ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                      : "bg-black/5 text-zinc-900 dark:bg-white/10 dark:text-zinc-50"
                  }`}
                >
                  {m.text}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={sendChat} className="flex gap-2 border-t border-black/10 p-3 dark:border-white/10">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Message..."
              className="flex-1 rounded-lg border border-black/10 bg-transparent px-2 py-1 text-sm outline-none focus:border-zinc-400 dark:border-white/10"
            />
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-3 py-1 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
            >
              Envoyer
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
