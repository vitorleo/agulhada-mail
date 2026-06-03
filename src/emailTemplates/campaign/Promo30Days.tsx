import { Heading, Link, Section, Text } from "react-email";
import React from "react";
import { emailAssets } from "../assets.js";
import { EmailButton } from "../components/EmailButton.js";
import { EmailLayout } from "../components/EmailLayout.js";
import type { ReactEmailTemplateProps } from "../types.js";

export default function Promo30Days({ data }: ReactEmailTemplateProps) {
  const name = stringValue(data.name) || stringValue(data.firstName) || "Trader";
  const email = stringValue(data.email);
  const promoUrl = buildPromoUrl(email);

  return (
    <EmailLayout
      preview="Experimente o Agulhada.com por 30 dias"
      recipientEmail={email}
      unsubscribeUrl={stringValue(data.unsubscribeUrl)}
      footerReason="Voce recebeu este email pois e aluno do CST ou se cadastrou para receber novidades do Agulhada.com."
    >
      <Heading style={styles.heading}>30 dias para testar o Agulhada.com</Heading>
      <Text style={styles.text}>Ola {name},</Text>
      <Text style={styles.text}>
        Quer usar todos os recursos do <Link href={emailAssets.websiteUrl}>Agulhada.com</Link> e receber alertas de
        agulhadas no seu Telegram sem pagar nada?
      </Text>
      <Text style={styles.text}>
        Fizemos uma parceria com o Didi Aguiar e temos uma promocao exclusiva para alunos do CST.
      </Text>
      <Text style={styles.text}>
        Voce foi selecionado para experimentar o Agulhada.com por 30 dias sem custo. Aceitando este convite, voce tera
        acesso aos recursos do Plano VIP sem precisar informar cartao de credito.
      </Text>
      <Section style={styles.cta}>
        <EmailButton href={promoUrl} backgroundColor="#ea580c">Quero meus 30 dias gratis</EmailButton>
      </Section>
    </EmailLayout>
  );
}

function buildPromoUrl(email?: string): string {
  if (!email) return emailAssets.promo30DaysUrl;
  return `${emailAssets.promo30DaysUrl}?email=${encodeURIComponent(email)}`;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

const styles = {
  heading: {
    fontSize: "26px",
    lineHeight: "34px",
    margin: "0 0 20px",
    textAlign: "center" as const
  },
  text: {
    fontSize: "16px",
    lineHeight: "24px",
    margin: "0 0 16px"
  },
  cta: {
    textAlign: "center" as const,
    marginTop: "24px"
  }
};
