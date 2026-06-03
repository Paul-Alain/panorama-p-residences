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
  paragraph,
  securityNote,
  securityText,
} from './brand'

interface EmailChangeEmailProps {
  siteName?: string
  oldEmail?: string
  email?: string
  newEmail?: string
  confirmationUrl?: string
}

export const EmailChangeEmail = ({
  oldEmail = '',
  newEmail = '',
  confirmationUrl = '#',
}: EmailChangeEmailProps) => (
  <EmailShell preview="Confirmez votre nouvelle adresse · Confirm your new email — Panorama P Residence">
    {/* Français */}
    <Text style={h1}>Confirmez votre nouvelle adresse e-mail</Text>
    <Text style={lead}>
      Vous avez demandé à modifier l'adresse e-mail de votre compte
      {oldEmail ? ` (${oldEmail})` : ''}
      {newEmail ? ` vers ${newEmail}` : ''}. Confirmez ce changement ci-dessous.
    </Text>
    <Section style={ctaWrap}>
      <Button style={button} href={confirmationUrl}>
        Confirmer le changement
      </Button>
    </Section>
    <Section style={securityNote}>
      <Text style={securityText}>
        Sécurité : si vous n'êtes pas à l'origine de cette demande, sécurisez
        votre compte immédiatement.
      </Text>
    </Section>

    <Hr style={langRule} />

    {/* English */}
    <Text style={enLabel}>English</Text>
    <Text style={h1}>Confirm your new email address</Text>
    <Text style={paragraph}>
      You requested to change the email address on your account. Confirm this
      change using the button above.
    </Text>
  </EmailShell>
)

export default EmailChangeEmail
