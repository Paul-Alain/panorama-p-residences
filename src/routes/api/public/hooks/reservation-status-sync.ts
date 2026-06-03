import { createFileRoute } from "@tanstack/react-router";

/**
 * Daily reservation status automation (called by pg_cron).
 *
 * Transition rules (kept conservative so core booking decisions stay with
 * staff, and no schema/RLS is changed):
 *   - departure_date has passed  →  status "terminée" (checkout complete)
 *
 * Maintenance blocks ("bloqué") and cancelled rows are never touched.
 *
 * Auth: this lives under /api/public/* (auth bypassed at the edge). We still
 * require the project's anon key in the `apikey` header so it is not trivially
 * callable. The operation is idempotent and only advances statuses by date.
 */
export const Route = createFileRoute("/api/public/hooks/reservation-status-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!expected || apikey !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        const today = new Date().toISOString().slice(0, 10);

        // Complete stays whose departure day has passed.
        const { data: completed, error } = await supabaseAdmin
          .from("reservations")
          .update({ status: "terminée" })
          .lte("departure_date", today)
          .in("status", ["nouvelle", "confirmée"])
          .select("id");

        if (error) {
          console.error("reservation-status-sync error:", error.message);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({ success: true, completed: completed?.length ?? 0 }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
