import { io, type Socket } from 'socket.io-client';
import { ensureValidAccessToken } from '@/lib/auth/tokenManager';
import { getSocketBaseUrl } from '@/lib/tracker/utils/socketUrl';

let sharedSocket: Socket | null = null;
let connecting: Promise<Socket> | null = null;

export async function getAppSocket(): Promise<Socket> {
  if (sharedSocket?.connected) return sharedSocket;
  if (connecting) return connecting;

  connecting = (async () => {
    const token = await ensureValidAccessToken();
    if (sharedSocket) {
      sharedSocket.auth = token ? { token } : {};
      if (!sharedSocket.connected) sharedSocket.connect();
      return sharedSocket;
    }

    sharedSocket = io(getSocketBaseUrl(), {
      auth: token ? { token } : {},
      transports: ['websocket', 'polling'],
      reconnection: true,
      autoConnect: true,
    });

    return sharedSocket;
  })();

  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}

export function disconnectAppSocket() {
  if (sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
  }
}
