import * as React from 'react'
import { render } from '@react-email/components'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'Panorama P Residence'
// Verified sender subdomain delegated to Lovable's nameservers.
const SENDER_DOMAIN = 'notify.panorama-p-residence.com'
// Cosmetic From: domain.
const FROM_DOMAIN = 'panorama-p-residence.com'

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

type EnqueueResult =
  | { success: true; queued: true }
  | { success: false; reason: 'email_suppressed' | 'unknown_template' | 'error' }

/**
 * Server-only helper to enqueue a branded transactional (app) email using the
 * service-role client. Mirrors the JWT-gated /lovable/email/transactional/send
 * route, but is callable from trusted server contexts (server functions and
 * public action routes) where there is no end-user JWT.
 */
export async function enqueueAppEmail(opts: {
  templateName: string
  recipientEmail: string
  idempotencyKey?: string
  templateData?: Record<string, any>
}): Promise<EnqueueResult> {
  const { templateName, templateData = {} } = opts
  const recipient = opts.recipientEmail?.trim()
  if (!recipient) return { success: false, reason: 'error' }

  const template = TEMPLATES[templateName]
  if (!template) {
    console.error('enqueueAppEmail: unknown template', { templateName })
    return { success: false, reason: 'unknown_template' }
  }

  const supabase = supabaseAdmin
  const normalizedEmail = recipient.toLowerCase()
  const messageId = crypto.randomUUID()
  const idempotencyKey = opts.idempotencyKey || messageId

  // 1. Suppression check (fail-closed)
  const { data: suppressed, error: suppressionError } = await supabase
    .from('suppressed_emails')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle()
  if (suppressionError) {
    console.error('enqueueAppEmail: suppression check failed', {
      error: suppressionError.message,
    })
    return { success: false, reason: 'error' }
  }
  if (suppressed) {
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: recipient,
      status: 'suppressed',
    })
    return { success: false, reason: 'email_suppressed' }
  }

  // 2. Get or create unsubscribe token (one per address)
  let unsubscribeToken: string
  const { data: existingToken } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (existingToken && !existingToken.used_at) {
    unsubscribeToken = existingToken.token
  } else if (!existingToken) {
    unsubscribeToken = generateToken()
    await supabase
      .from('email_unsubscribe_tokens')
      .upsert(
        { token: unsubscribeToken, email: normalizedEmail },
        { onConflict: 'email', ignoreDuplicates: true },
      )
    const { data: storedToken } = await supabase
      .from('email_unsubscribe_tokens')
      .select('token')
      .eq('email', normalizedEmail)
      .maybeSingle()
    unsubscribeToken = storedToken?.token ?? unsubscribeToken
  } else {
    // Token used but not suppressed — treat as suppressed for safety.
    return { success: false, reason: 'email_suppressed' }
  }

  // 3. Render the email
  const element = React.createElement(template.component, templateData)
  const html = await render(element)
  const text = await render(element, { plainText: true })
  const subject =
    typeof template.subject === 'function'
      ? template.subject(templateData)
      : template.subject

  // 4. Log pending + enqueue
  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: templateName,
    recipient_email: recipient,
    status: 'pending',
  })

  const { error: enqueueError } = await supabase.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: recipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: 'transactional',
      label: templateName,
      idempotency_key: idempotencyKey,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  })

  if (enqueueError) {
    console.error('enqueueAppEmail: enqueue failed', {
      error: enqueueError.message,
      templateName,
    })
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: recipient,
      status: 'failed',
      error_message: 'Failed to enqueue email',
    })
    return { success: false, reason: 'error' }
  }

  return { success: true, queued: true }
}
