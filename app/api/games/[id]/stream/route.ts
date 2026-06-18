import { subscribeGame } from "@/server/lib/game-events";
import { getDb, schema } from "@/server/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: gameId } = await context.params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const db = getDb();
      let lastVersion = -1;

      const push = (version: number) => {
        if (version === lastVersion) return;
        lastVersion = version;
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ version })}\n\n`)
        );
      };

      const game = await db.query.games.findFirst({
        where: eq(schema.games.id, gameId),
        columns: { stateVersion: true },
      });
      if (game) push(game.stateVersion);

      const unsub = subscribeGame(gameId, (_gid, version) => push(version));

      const interval = setInterval(async () => {
        const g = await db.query.games.findFirst({
          where: eq(schema.games.id, gameId),
          columns: { stateVersion: true },
        });
        if (g) push(g.stateVersion);
      }, 3000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        unsub();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
