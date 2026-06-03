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

interface MagicLinkEmailProps {
  siteName?: string
  confirmationUrl?: string
}

export const MagicLinkEmail = ({
  confirmationUrl = '#',
}: MagicLinkEmailProps) => (
  <EmailShell preview="Votre lien de connexion · Your login link — Panorama P Residence">
    {/* Français */}
    <Text style={h1}>Votre lien de connexion</Text>
    <Text style={lead}>
      Connectez-vous à votre espace Panorama P Residence en un clic grâce au lien
      sécurisé ci-dessous.
    </Text>
    <Section style={ctaWrap}>
      <Button style={button} href={confirmationUrl}>
        Se connecter
      </Button>
    </Section>
    <Section style={securityNote}>
      <Text style={securityText}>
        Sécurité : ce lien est personnel et expire rapidement. Ne le partagez
        avec personne.
      </Text>
    </Section>

    <Hr style={langRule} />

    {/* English */}
    <Text style={enLabel}>English</Text>
    <Text style={h1}>Your login link</Text>
    <Text style={paragraph}>
      Sign in to your Panorama P Residence account in one click with the secure
      link below.
    </Text>
    <Section style={ctaWrap}>
      <Button style={button} href={confirmationUrl}>
        Log in
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

export default MagicLinkEmail
