import { handleApi } from "@/server/lib/handle-api";
import { computeLeagueStatistics } from "@/server/services/league-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleApi(() => computeLeagueStatistics(id));
}
