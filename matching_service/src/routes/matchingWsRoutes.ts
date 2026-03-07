import { IncomingMessage } from "http";
import { parse } from "url";
import type { WebSocket } from "ws";
import { cancelMatchRequest, enqueue, removeUserFromQueue } from "../controllers/matchingController";
import {
  wsConnectionMap,
} from "../store/inMemoryStore";
import { InboundMessageSchema } from "../validators/match.schema";

export function handleWsConnection(ws: WebSocket, req: IncomingMessage): void {
  // Parse userId from query string: ws://host/match/ws?userId=xxx
  const { query } = parse(req.url ?? "", true);
  const userId = query.userId;

  if (!userId || typeof userId !== "string") {
    ws.close(1008, "Missing or invalid userId");
    return;
  }

  // Reject duplicate sessions — each user may only hold one active connection
  if (wsConnectionMap.has(userId)) {
    ws.close(1008, "User already has an active connection");
    return;
  }

  // Create UserID -> WS mapping in wsConnectionMap dictionary
  wsConnectionMap.set(userId, ws);
  console.log(`User ${userId} connected`);

  ws.on("message", (raw) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.toString());
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      return;
    }

    const result = InboundMessageSchema.safeParse(parsed);
    if (!result.success) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Invalid message format",
          details: result.error,
        }),
      );
      return;
    }

    // Logic for handling Enqueue or Cancel requests from the user
    const msg = result.data;
    if (msg.type === "enqueue") {
      enqueue({
        userId,
        topic: msg.topic,
        difficulty: msg.difficulty,
        language: msg.language,
      });
    } else if (msg.type === "cancel") {
      try {
        cancelMatchRequest(userId);
      } catch (err) {
        ws.send(
          JSON.stringify({ type: "error", message: (err as Error).message }),
        );
      }
    }
  });

  ws.on("close", () => {
    console.log(`User ${userId} disconnected`);
    removeUserFromQueue(userId);
  });
}
