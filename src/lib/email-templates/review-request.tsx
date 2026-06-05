import * as React from 'react'
import { Section, Text, Button } from '@react-email/components'
import type { TemplateEntry } from './registry'
import {
  EmailShell, card, enLabel, h1, lead, paragraph, rowLabel, rowValue,
} from './brand'

interface ReviewRequestProps {
  name?: string
  reviewUrl?: string
}

const Email = ({
  name = 'cher client',
  reviewUrl = '#',
}: ReviewRequestProps) => (
  <EmailShell preview="Donnez votre avis sur votre séjour · Share your experience — Panorama P">
    {/* ── Français ── */}
    <Text style={h1}>Bonjour {name},</Text>
    <Text style={lead}>
      Merci d'avoir séjourné à la Résidence Panorama P à Bafoussam.
      Votre séjour est maintenant terminé et nous espérons que vous avez
      passé un excellent moment.
    </Text>
    <Text style={paragraph}>
      Nous serions très reconnaissants si vous pouviez prendre 2 minutes
      pour nous laisser votre avis. Cela nous aide à améliorer nos
      services et à accueillir encore mieux nos prochains clients.
    </Text>
    <Section style={{ textAlign: 'center', margin: '24px 0' }}>
      <Button
        href={reviewUrl}
        style={{
          backgroundColor: '#92400e',
          color: '#fff',
          borderRadius: 8,
          padding: '12px 28px',
          fontWeight: 700,
          fontSize: 15,
          textDecoration: 'none',
          display: 'inline-block',
        }}>
        ⭐ Laisser mon avis
      </Button>
    </Section>
    <Text style={{ ...paragraph, fontSize: 12, color: '#888' }}>
      Ce lien est valable 30 jours. Si vous ne souhaitez pas laisser
      d'avis, ignorez simplement cet email.
    </Text>

    {/* ── English ── */}
    <Text style={enLabel}>— English below —</Text>
    <Text style={h1}>Dear {name},</Text>
    <Text style={lead}>
      Thank you for staying at Résidence Panorama P in Bafoussam.
      We hope you had a wonderful experience with us.
    </Text>
    <Text style={paragraph}>
      We would greatly appreciate it if you could take 2 minutes to
      share your feedback. It helps us improve our services and welcome
      future guests even better.
    </Text>
    <Section style={{ textAlign: 'center', margin: '24px 0' }}>
      <Button
        href={reviewUrl}
        style={{
          backgroundColor: '#92400e',
          color: '#fff',
          borderRadius: 8,
          padding: '12px 28px',
          fontWeight: 700,
          fontSize: 15,
          textDecoration: 'none',
          display: 'inline-block',
        }}>
        ⭐ Leave my review
      </Button>
    </Section>
    <Text style={{ ...paragraph, fontSize: 12, color: '#888' }}>
      This link is valid for 30 days. If you do not wish to leave a
      review, simply ignore this email.
    </Text>
  </EmailShell>
)

export const template: TemplateEntry = {
  component: Email,
  subject: (d) =>
    `${d.name ?? 'Cher client'}, partagez votre avis sur votre séjour · Share your experience`,
  displayName: 'Demande d\'avis client',
  previewData: { name: 'Jean Dupont', reviewUrl: 'https://panorama-p-residence.com/noter/abc123' },
}

export default Email
