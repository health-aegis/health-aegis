import { Request, Response } from 'express';

// COORDINATOR_AGENT_URL is set inline in the K8s deployment env block.
// Default uses the Kubernetes ClusterIP service name.
const COORDINATOR_URL =
  process.env.COORDINATOR_AGENT_URL || 'http://coordinator-agent:8000';

/**
 * POST /api/agents/analyze
 * Body: { query: string }
 * Auth: JWT required — authMiddleware sets req.userId before this handler runs.
 *
 * Proxies the request to the Coordinator Agent which fans out to
 * Image Analysis Agent + Patient History Agent in parallel, then
 * synthesises a Gemini response and returns it.
 */
export const handleAgentAnalysis = async (req: Request, res: Response) => {
  const { query } = req.body;
  const userId = req.userId; // set by authMiddleware (typed in global Express namespace)

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({ error: 'query is required and must be a non-empty string.' });
  }

  // userId is always present after authMiddleware — this is a safety net only
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const coordinatorRes = await fetch(`${COORDINATOR_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, query: query.trim() }),
    });

    if (!coordinatorRes.ok) {
      const errText = await coordinatorRes.text();
      console.error('[agentController] Coordinator error:', coordinatorRes.status, errText);
      return res.status(coordinatorRes.status).json({
        error: 'Multi-agent analysis returned an error.',
        detail: errText,
      });
    }

    const data = await coordinatorRes.json();
    return res.json(data);
  } catch (e: any) {
    console.error('[agentController] Coordinator unreachable:', e.message);
    return res.status(502).json({
      error: 'Multi-agent service is temporarily unavailable. Please try again shortly.',
    });
  }
};
