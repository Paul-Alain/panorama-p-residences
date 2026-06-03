import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { enqueueAppEmail } from '@/lib/email/enqueue.server'

const BodySchema = z.object({
  email: z.string().email().max(160),
  name: z.string().min(1).max(120),
})

// Sends the branded contact-confirmation email. To prevent abuse, the route
// verifies (with the service-role client) that a matching contact message was
// actually created recently before sending.
export const Route = createFileRoute('/api/public/email/contact-confirmation')({
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
          .from('messages')
          .select('id, message')
          .eq('email', parsed.email)
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!match) {
          // No recent matching record — silently accept without sending.
          return Response.json({ success: true, sent: false })
        }

        const result = await enqueueAppEmail({
          templateName: 'contact-confirmation',
          recipientEmail: parsed.email,
          idempotencyKey: `contact-${match.id}`,
          templateData: {
            name: parsed.name,
            message: (match.message ?? '').slice(0, 600),
          },
        })

        return Response.json({ success: true, sent: result.success })
      },
    },
  },
})
