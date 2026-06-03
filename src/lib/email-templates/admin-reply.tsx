import * as React from 'react'
import { Hr, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import {
  EmailShell,
  brand,
  card,
  enLabel,
  h1,
  langRule,
  lead,
  paragraph,
  rowLabel,
  rowValue,
} from './brand'

interface AdminReplyProps {
  name?: string
  reply?: string
  originalMessage?: string
}

const replyBox = {
  backgroundColor: brand.white,
  border: `1px solid ${brand.gold}`,
  borderRadius: '12px',
  padding: '16px 18px',
  margin: '6px 0 22px',
}

const replyText = {
  margin: 0,
  color: brand.ink,
  fontSize: '15px',
  lineHeight: '24px',
  whiteSpace: 'pre-line' as const,
}

const Email = ({
  name = 'cher client',
  reply = '',
  originalMessage = '',
}: AdminReplyProps) => (
  <EmailShell preview="Réponse de Panorama P Residence · A reply from our team">
    {/* Français */}
    <Text style={h1}>Bonjour {name},</Text>
    <Text style={lead}>
      L'équipe de Panorama P Residence a répondu à votre message :
    </Text>

    <Section style={replyBox}>
      <Text style={replyText}>{reply || '—'}</Text>
    </Section>

    {originalMessage ? (
      <Section style={card}>
        <Text style={rowLabel}>Votre message initial · Your original message</Text>
        <Text style={rowValue}>{originalMessage}</Text>
      </Section>
    ) : null}

    <Hr style={langRule} />

    {/* English */}
    <Text style={enLabel}>English</Text>
    <Text style={h1}>Hello {name},</Text>
    <Text style={paragraph}>
      The Panorama P Residence team has replied to your message. You can read our
      response above. Feel free to reply to this email if you need anything else.
    </Text>
  </EmailShell>
)

export const template = {
  component: Email,
  subject: 'Réponse de Panorama P Residence',
  displayName: 'Admin reply',
  previewData: {
    name: 'Marie K.',
    reply: 'Bonjour, nous confirmons votre disponibilité pour les dates demandées. Au plaisir de vous accueillir !',
    originalMessage: 'Avez-vous une chambre libre du 10 au 14 août ?',
  },
} satisfies TemplateEntry

export default Email
