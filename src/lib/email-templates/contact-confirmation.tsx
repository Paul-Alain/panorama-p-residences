import * as React from 'react'
import { Hr, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import {
  EmailShell,
  card,
  enLabel,
  h1,
  langRule,
  lead,
  paragraph,
  rowLabel,
  rowValue,
} from './brand'

interface ContactConfirmationProps {
  name?: string
  message?: string
}

const Email = ({
  name = 'cher client',
  message = '',
}: ContactConfirmationProps) => (
  <EmailShell preview="Message bien reçu · We received your message — Panorama P Residence">
    {/* Français */}
    <Text style={h1}>Merci de nous avoir écrit, {name}</Text>
    <Text style={lead}>
      Votre message a bien été reçu par l'équipe de Panorama P Residence. Nous
      vous répondrons dans les plus brefs délais.
    </Text>

    {message ? (
      <Section style={card}>
        <Text style={rowLabel}>Votre message · Your message</Text>
        <Text style={rowValue}>{message}</Text>
      </Section>
    ) : null}

    <Hr style={langRule} />

    {/* English */}
    <Text style={enLabel}>English</Text>
    <Text style={h1}>Thank you for reaching out, {name}</Text>
    <Text style={paragraph}>
      Your message has been received by the Panorama P Residence team. We'll get
      back to you as soon as possible.
    </Text>
  </EmailShell>
)

export const template = {
  component: Email,
  subject: 'Nous avons bien reçu votre message · Panorama P Residence',
  displayName: 'Contact confirmation',
  previewData: {
    name: 'Jean P.',
    message: 'Bonjour, je souhaite connaître vos disponibilités en août.',
  },
} satisfies TemplateEntry

export default Email
