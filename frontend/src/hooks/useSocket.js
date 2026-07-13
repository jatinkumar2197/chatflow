import { useEffect } from "react";
import socketService from "../services/socket";

/**
 * Subscribes to incoming WebSocket events for the lifetime of a component.
 * @param {(payload: object) => void} onEvent
 */
export function useSocket(onEvent) {
  useEffect(() => {
    const unsubscribe = socketService.subscribe(onEvent);
    return unsubscribe;
  }, [onEvent]);
}
