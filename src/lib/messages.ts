// Messages échangés sur le websocket PartyKit. Le serveur (party/room.ts) se
// contente de relayer ces messages tels quels aux autres clients de la room.
export type SignalingMessage =
  // Échangé à la connexion pour que chacun connaisse l'id de l'autre et
  // détermine qui est "polite" lors d'une collision de renégociation WebRTC.
  | { type: "hello"; id: string }
  | { type: "webrtc-offer"; sdp: string }
  | { type: "webrtc-answer"; sdp: string }
  | { type: "webrtc-ice"; candidate: RTCIceCandidateInit }
  // Indique à quoi correspond un MediaStream envoyé sur la connexion (écran
  // ou webcam), pour que le receveur sache où l'afficher. `active: false`
  // signifie que ce flux vient d'être coupé.
  | {
      type: "stream-info";
      streamId: string;
      kind: "screen" | "webcam";
      active: boolean;
    }
  | { type: "chat"; text: string; from: string; ts: number };

export type ServerMessage =
  | SignalingMessage
  | { type: "peer-count"; count: number };
