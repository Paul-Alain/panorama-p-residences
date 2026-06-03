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
  securityNote,
  securityText,
} from './brand'

interface SignupEmailProps {
  siteName?: string
  siteUrl?: string
  recipient?: string
  confirmationUrl?: string
}

export const SignupEmail = ({ confirmationUrl = '#' }: SignupEmailProps) => (
  <EmailShell preview="Confirmez votre adresse e-mail · Confirm your email — Panorama P Residence">
    {/* Français */}
    <Text style={h1}>Bienvenue chez Panorama P Residence</Text>
    <Text style={lead}>
      Merci de créer votre compte. Confirmez votre adresse e-mail pour finaliser
      votre inscription et préparer votre séjour à Bafoussam.
    </Text>
    <Section style={ctaWrap}>
      <Button style={button} href={confirmationUrl}>
        Confirmer mon e-mail
      </Button>
    </Section>
    <Section style={securityNote}>
      <Text style={securityText}>
        Sécurité : si vous n'êtes pas à l'origine de cette demande, ignorez
        simplement cet e-mail. Aucun compte ne sera activé.
      </Text>
    </Section>

    <Hr style={langRule} />

    {/* English */}
    <Text style={enLabel}>English</Text>
    <Text style={h1}>Welcome to Panorama P Residence</Text>
    <Text style={paragraph}>
      Thank you for creating your account. Please confirm your email address to
      complete your registration and start planning your stay in Bafoussam.
    </Text>
    <Section style={ctaWrap}>
      <Button style={button} href={confirmationUrl}>
        Verify my email
      </Button>
    </Section>
    <Text style={linkFallback}>
      Si le bouton ne fonctionne pas, copiez ce lien / If the button does not
      work, copy this link:
      <br />
      {confirmationUrl}
    </Text>
  </EmailShell>
)

export default SignupEmail
