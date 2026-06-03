import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { enqueueAppEmail } from '@/lib/email/enqueue.server'

const BodySchema = z.object({
  email: z.string().email().max(160),
  name: z.string().min(1).max(120),
  unitLabel: z.string().max(160).optional(),
})

// Sends the branded reservation-confirmation email. Verifies (service-role)
// that a matching reservation was created recently before sending.
export const Route = createFileRoute('/api/public/email/reservation-confirmation')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed
        try {
          parsed = BodySchema.parse(await request.json())
        } catch {
          return Response.json({ error: 'Invalid input' }, { status: 400 })
        }

        const since = new Date(Date.now() - 15 * 60 * 1000).toISOString()
        const { data: match } = await supabaseAdmin
          .from('reservations')
          .select('id, arrival_date, departure_date, guests')
          .eq('email', parsed.email)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!match) {
          return Response.json({ success: true, sent: false })
        }

        const result = await enqueueAppEmail({
          templateName: 'reservation-confirmation',
          recipientEmail: parsed.email,
          idempotencyKey: `reservation-${match.id}`,
          templateData: {
            name: parsed.name,
            arrival: match.arrival_date ?? '',
            departure: match.departure_date ?? '',
            guests: match.guests ?? '',
            unitLabel: parsed.unitLabel ?? '',
          },
        })

        return Response.json({ success: true, sent: result.success })
      },
    },
  },
})
