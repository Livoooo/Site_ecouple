// STUN public (Google) + TURN gratuit (Open Relay Project) en fallback pour
// traverser les NAT restrictifs. Si la connexion échoue souvent entre vos deux
// réseaux, il faudra passer à un TURN payant ou auto-hébergé (coturn).
export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];
