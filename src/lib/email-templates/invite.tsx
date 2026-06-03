import * as React from 'react'
import { Button, Hr, Section, Text } from '@react-email/components'
import {
  EmailShell,
  button,
  ctaWrap,
  enLabel,
  h1,
  langRule,
  lead,
  linkFallback,
  paragraph,
} from './brand'

interface InviteEmailProps {
  siteName?: string
  siteUrl?: string
  confirmationUrl?: string
}

export const InviteEmail = ({ confirmationUrl = '#' }: InviteEmailProps) => (
  <EmailShell preview="Vous êtes invité · You've been invited — Panorama P Residence">
    {/* Français */}
    <Text style={h1}>Vous êtes invité</Text>
    <Text style={lead}>
      Vous avez été invité à rejoindre l'espace Panorama P Residence. Acceptez
      l'invitation pour créer votre compte.
    </Text>
    <Section style={ctaWrap}>
      <Button style={button} href={confirmationUrl}>
        Accepter l'invitation
      </Button>
    </Section>

    <Hr style={langRule} />

    {/* English */}
    <Text style={enLabel}>English</Text>
    <Text style={h1}>You've been invited</Text>
    <Text style={paragraph}>
      You've been invited to join Panorama P Residence. Accept the invitation to
      create your account.
    </Text>
    <Section style={ctaWrap}>
      <Button style={button} href={confirmationUrl}>
        Accept invitation
      </Button>
    </Section>
    <Text style={linkFallback}>
      Si vous n'attendiez pas cette invitation, ignorez cet e-mail. / If you
      weren't expecting this invitation, you can safely ignore this email.
    </Text>
  </EmailShell>
)

export default InviteEmail
