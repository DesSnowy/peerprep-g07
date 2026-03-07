import { Router, Request, Response } from "express";
import {
  cancelMatchRequest,
  enqueue,
} from "../controllers/matchingController";
import { userStateMap } from "../store/inMemoryStore";
import {
  QueueRequestSchema,
  UserIdRequestSchema,
} from "../validators/match.schema";

const router = Router();

/**
 * POST /match/enqueue
 * Body: { userId, topic, difficulty, language }
 *
 * Enqueues a user for matching. Returns 409 if the user is already queued.
 * Note: the matched/queued/timeout notifications are still delivered over WebSocket.
 */
router.post("/enqueue", (req: Request, res: Response) => {
  const result = QueueRequestSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid request body", details: result.error.issues });
    return;
  }

  const { userId, topic, difficulty, language } = result.data;

  if (userStateMap.has(userId)) {
    res.status(409).json({ error: "User is already in a queue or a match" });
    return;
  }

  enqueue({ userId, topic, difficulty, language });
  res.status(200).json({ status: "queued" });
});

/**
 * POST /match/cancel
 * Body: { userId }
 *
 * Cancels an active queue request for the given user.
 */
router.post("/cancel", (req: Request, res: Response) => {
  const result = UserIdRequestSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid request body", details: result.error.issues });
    return;
  }

  const { userId } = result.data;

  try {
    cancelMatchRequest(userId);
    res.status(200).json({ status: "cancelled" });
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

export default router;