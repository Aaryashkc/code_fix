// useSocketNegotiation — stub hook for real-time negotiation via Socket.io
// Currently provides no-op implementations. Wire up actual socket events
// when the frontend Socket.io client is integrated.

type NegotiationPayload = Record<string, unknown>;
type NegotiationUpdateHandler = (data: NegotiationPayload) => void;

interface UseSocketNegotiationReturn {
  sendCounterOffer: (bookingId: string, price: number, message: string) => boolean;
  acceptOffer: (bookingId: string) => boolean;
  declineOffer: (bookingId: string, reason?: string) => boolean;
  isConnected: boolean;
  listenToNegotiation: (
    onUpdate: NegotiationUpdateHandler,
    onAccepted: NegotiationUpdateHandler,
    onDeclined: NegotiationUpdateHandler,
    onCounterOffer: NegotiationUpdateHandler
  ) => void;
}

export function useSocketNegotiation(_bookingId: string): UseSocketNegotiationReturn {
  // TODO: Replace stubs with real Socket.io-client calls once
  // the SocketContext is wired up with an actual connection.
  void _bookingId;

  return {
    isConnected: false,

    sendCounterOffer: () => {
      console.warn('[useSocketNegotiation] sendCounterOffer: socket not connected');
      return false;
    },

    acceptOffer: () => {
      console.warn('[useSocketNegotiation] acceptOffer: socket not connected');
      return false;
    },

    declineOffer: () => {
      console.warn('[useSocketNegotiation] declineOffer: socket not connected');
      return false;
    },

    listenToNegotiation: () => {
      // No-op until socket integration is complete
    },
  };
}
