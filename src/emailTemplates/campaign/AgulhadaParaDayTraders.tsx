import { Heading, Link, Section, Text } from "react-email";
import React from "react";
import { emailAssets } from "../assets.js";
import { EmailButton } from "../components/EmailButton.js";
import { EmailLayout } from "../components/EmailLayout.js";
import type { ReactEmailTemplateProps } from "../types.js";

export default function AgulhadaParaDayTraders({ data }: ReactEmailTemplateProps) {
  const name = stringValue(data.name) || stringValue(data.firstName) || "Trader";
  const email = stringValue(data.email);
  const promoUrl = buildPromoUrl(email);

  return (
    <EmailLayout
      preview="Assinantes VIP agora podem monitorar oportunidades no gráfico de 5 minutos."
      recipientEmail={email}
      unsubscribeUrl={stringValue(data.unsubscribeUrl)}
      footerReason="Você recebeu este email pois é aluno do CST ou se cadastrou para receber novidades do Agulhada.com."
    >
      <Heading style={styles.heading}>O gráfico de 5 minutos chegou ao Agulhada.com</Heading>
      <Text style={styles.text}>Olá {name},</Text>
      <Text style={styles.text}>
        Programamos o robô do <Link href={emailAssets.websiteUrl}>Agulhada.com</Link> para monitorar o tempo gráfico
        de 5 minutos nos ativos mais operados por day traders no Brasil e no exterior.
      </Text>
      <Text style={styles.text}>
        Na prática, os assinantes do Plano VIP gastam menos tempo pulando de gráfico em gráfico e ganham mais foco nas
        oportunidades que realmente aparecem no ritmo do intraday. As notificações no Telegram também estão disponíveis
        quando surgir uma possível compra ou venda nos ativos que você acompanha no 5 minutos.
      </Text>
      <Text style={styles.text}>
        Também liberamos a nova visualização em tabela, disponível em todos os planos. Ela concentra as oportunidades
        por ativo e tempo gráfico, para você encontrar mais rápido as agulhadas que combinam com o seu operacional.
      </Text>
      <Text style={styles.text}>
        Isso muda o ritmo: você abre o Agulhada, filtra o que importa e decide onde vale olhar com mais atenção.
      </Text>
      <Text style={styles.text}>
        Se você já é assinante, você encontra tudo isso na nova versão do Agulhada.com: <Link href="https://next.agulhada.com">https://next.agulhada.com</Link>
      </Text>
      <Section style={styles.cta}>
        <EmailButton href={promoUrl} backgroundColor="#ea580c">Assinar com 7 dias grátis</EmailButton>
      </Section>
    </EmailLayout>
  );
}

function buildPromoUrl(email?: string): string {
  if (!email) return emailAssets.subscriptionUrl;
  return `${emailAssets.subscriptionUrl}?email=${encodeURIComponent(email)}`;
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
