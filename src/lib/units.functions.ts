import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * Public availability check. Returns the ids of units that are already booked
 * for the requested date range so the booking form can hide them. Uses the
 * admin client to read reservations (RLS hides them from anonymous visitors),
 * but only ever returns unit ids — never any guest PII.
 *
 * Overlap rule: a booking [arrival, departure) conflicts when
 *   arrival_date < range_end AND departure_date > range_start
 * (departure day is treated as checkout / free).
 */
export const getUnitAvailability = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ arrival: DATE, departure: DATE }).parse(input),
  )
  .handler(async ({ data }) => {
    if (data.departure <= data.arrival) return { bookedUnitIds: [] as string[] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("reservations")
      .select("logement_unit_id, arrival_date, departure_date, status")
      .not("logement_unit_id", "is", null)
      .in("status", ["nouvelle", "confirmée"])
      .lt("arrival_date", data.departure)
      .gt("departure_date", data.arrival);
    if (error) throw new Error(error.message);
    const bookedUnitIds = Array.from(
      new Set((rows ?? []).map((r) => r.logement_unit_id as string)),
    );
    return { bookedUnitIds };
  });
