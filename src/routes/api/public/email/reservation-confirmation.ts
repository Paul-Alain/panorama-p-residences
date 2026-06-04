import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { enqueueAppEmail } from '@/lib/email/enqueue.server'

const BodySchema = z.object({
  email: z.string().email().max(160).optional().or(z.literal('')),
  name: z.string().min(1).max(120),
  phone: z.string().max(40).optional(),
  unitLabel: z.string().max(160).optional(),
})

// Sends the branded reservation-confirmation email to the guest (when an email
// was given) and always notifies the team inbox of the new booking. Verifies
// (service-role) that a matching reservation was created recently.
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

        const guestEmail = parsed.email?.trim() || ''
        const since = new Date(Date.now() - 15 * 60 * 1000).toISOString()

        let query = supabaseAdmin
          .from('reservations')
          .select(
            'id, name, email, phone, arrival_date, departure_date, arrival_time, departure_time, guests, logement_type, message',
          )
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(1)

        // Match by email when provided, otherwise fall back to name (+phone).
        if (guestEmail) {
          query = query.eq('email', guestEmail)
        } else {
          query = query.eq('name', parsed.name)
          if (parsed.phone) query = query.eq('phone', parsed.phone)
        }

        const { data: match } = await query.maybeSingle()

        if (!match) {
          return Response.json({ success: true, sent: false })
        }

        // French long date + time, e.g. "12 juillet 2026 · 14:00".
        const fmtFr = (date?: string | null, time?: string | null) => {
          if (!date) return ''
          const dt = new Date(`${date}T${(time ?? '00:00').slice(0, 5)}:00`)
          if (Number.isNaN(dt.getTime())) return date
          const datePart = dt.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
          return time ? `${datePart} · ${time.slice(0, 5)}` : datePart
        }

        const arrivalFr = fmtFr(match.arrival_date, match.arrival_time)
        const departureFr = fmtFr(match.departure_date, match.departure_time)

        // 1. Guest confirmation (only when the guest supplied an email).
        let guestSent = false
        if (guestEmail) {
          const result = await enqueueAppEmail({
            templateName: 'reservation-confirmation',
            recipientEmail: guestEmail,
            idempotencyKey: `reservation-${match.id}`,
            templateData: {
              name: parsed.name,
              arrival: arrivalFr,
              departure: departureFr,
              guests: match.guests ?? '',
              unitLabel: parsed.unitLabel ?? '',
            },
          })
          guestSent = result.success
        }

        // 2. Always notify the residence manager of the new booking.
        const teamResult = await enqueueAppEmail({
          templateName: 'reservation-team-alert',
          recipientEmail: 'residencespanoramap@gmail.com',
          idempotencyKey: `reservation-team-${match.id}`,
          templateData: {
            name: match.name ?? parsed.name,
            email: match.email ?? guestEmail,
            phone: match.phone ?? parsed.phone ?? '',
            arrival: arrivalFr,
            departure: departureFr,
            guests: match.guests ?? '',
            unitLabel: parsed.unitLabel ?? '',
            message: match.message ?? '',
          },
        })

        return Response.json({
          success: true,
          sent: guestSent,
          teamNotified: teamResult.success,
        })
      },
    },
  },
})
