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

interface RecoveryEmailProps {
  siteName?: string
  confirmationUrl?: string
}

export const RecoveryEmail = ({ confirmationUrl = '#' }: RecoveryEmailProps) => (
  <EmailShell preview="Réinitialisation du mot de passe · Reset your password — Panorama P Residence">
    {/* Français */}
    <Text style={h1}>Réinitialisez votre mot de passe</Text>
    <Text style={lead}>
      Nous avons reçu une demande de réinitialisation du mot de passe de votre
      compte Panorama P Residence. Cliquez ci-dessous pour en choisir un nouveau.
    </Text>
    <Section style={ctaWrap}>
      <Button style={button} href={confirmationUrl}>
        Choisir un nouveau mot de passe
      </Button>
    </Section>
    <Section style={securityNote}>
      <Text style={securityText}>
        Sécurité : ce lien expire prochainement. Si vous n'avez pas demandé cette
        réinitialisation, ignorez cet e-mail — votre mot de passe restera
        inchangé.
      </Text>
    </Section>

    <Hr style={langRule} />

    {/* English */}
    <Text style={enLabel}>English</Text>
    <Text style={h1}>Reset your password</Text>
    <Text style={paragraph}>
      We received a request to reset the password for your Panorama P Residence
      account. Click below to choose a new one.
    </Text>
    <Section style={ctaWrap}>
      <Button style={button} href={confirmationUrl}>
        Reset password
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

export default RecoveryEmail
