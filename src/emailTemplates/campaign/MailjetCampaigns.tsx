import { Heading, Link, Section, Text } from "react-email";
import React from "react";
import { emailAssets } from "../assets.js";
import { EmailButton } from "../components/EmailButton.js";
import { EmailLayout } from "../components/EmailLayout.js";
import type { ReactEmailTemplateProps } from "../types.js";

type CampaignConfig = {
  preview: string;
  heading: string;
  subject: string;
  footerReason: string;
  ctaLabel: string;
  ctaUrl: "promo" | "subscription";
  includeGreeting?: boolean;
  paragraphs: Array<React.ReactNode>;
  listHeading?: string;
  listItems?: React.ReactNode[];
};

const configs = {
  marketing30DaysCst: {
    preview: "Não deixe de pegar as agulhadas do Didi",
    heading: "30 dias para testar o Agulhada.com",
    subject: "Experimente o Agulhada.com por 30 dias grátis",
    footerReason: "Você recebeu este email pois é aluno do CST.",
    ctaLabel: "Quero meus 30 dias grátis",
    ctaUrl: "promo",
    paragraphs: [
      <>
        Quer usar todos os recursos do <Link href={emailAssets.websiteUrl}>Agulhada.com</Link> e receber alertas de
        agulhadas do nosso robô no seu Telegram sem pagar um tostão?
      </>,
      "Fizemos uma parceria com o Didi Aguiar e temos uma promoção exclusiva para os alunos do CST.",
      <>
        Você está na lista de traders que podem experimentar o Agulhada.com por 30 dias sem custo. Aceitando este
        convite, você terá acesso a todos os serviços pagos do{" "}
        <Link href={emailAssets.subscriptionUrl}>Plano VIP</Link> do Agulhada.com, sem precisar informar o seu cartao
        de crédito.
      </>,
      "Para aproveitar a promoção basta clicar no botão:"
    ]
  },
  marketing30Days: {
    preview: "Não deixe de pegar as agulhadas do Didi",
    heading: "30 dias para testar o Agulhada.com",
    subject: "Experimente o Agulhada.com por 30 dias grátis",
    footerReason: "Você recebeu este email por estar cadastrado para receber promoções do Agulhada.com.",
    ctaLabel: "Quero meus 30 dias grátis",
    ctaUrl: "promo",
    paragraphs: [
      <>
        Quer usar todos os recursos do <Link href={emailAssets.websiteUrl}>Agulhada.com</Link> e receber alertas de
        agulhadas do nosso robô no seu Telegram sem pagar um tostão?
      </>,
      <>
        Você está na lista de traders que podem experimentar o Agulhada.com por 30 dias sem custo. Aceitando este
        convite, você terá acesso a todos os serviços pagos do{" "}
        <Link href={emailAssets.subscriptionUrl}>Plano VIP</Link> do Agulhada.com, sem precisar informar o seu cartao
        de crédito.
      </>,
      "Para aproveitar a promoção basta clicar no botão:"
    ]
  },
  trialExpiring: {
    preview: "Não deixe de pegar as agulhadas do Didi",
    heading: "Volte a ter acesso ao Agulhada.com",
    subject: "Receba alerta depois dos 30 dias",
    footerReason: "Você recebeu este email pois é assinante do Agulhada.com.",
    ctaLabel: "Veja os planos",
    ctaUrl: "subscription",
    paragraphs: [
      "Sua assinatura no Agulhada.com está prestes a expirar. Espero que tenha aproveitado bastante esses dias de experiência. No final dos 30 dias, nosso robô Telegram vai parar de enviar alertas e você deixará de ter acesso ao Dashboard completo.",
      "Para continuar recebendo os alertas, acessar o dashboard sem delay e com ativo desbloqueados e ter todas as funcionalidades do Agulhada.com, escolha um dos planos de assinatura a partir de R$75.00 na página de assinaturas.",
      <>Envie suas perguntas, sugestões ou problemas para <Link href={`mailto:${emailAssets.supportEmail}`}>{emailAssets.supportEmail}</Link>.</>
    ]
  },
  trialExpiring50Cst24: {
    preview: "Não deixe de pegar as agulhadas do Didi",
    heading: "Volte a ter acesso ao Agulhada.com",
    subject: "Receba alerta depois dos 30 dias",
    footerReason: "Você recebeu este email pois é assinante do Agulhada.com.",
    ctaLabel: "Veja os planos",
    ctaUrl: "subscription",
    paragraphs: [
      "Sua assinatura no Agulhada.com está prestes a expirar. Espero que tenha aproveitado bastante esses dias de experiência. No final dos 30 dias, nosso robô Telegram vai parar de enviar alertas e você deixará de ter acesso ao Dashboard completo.",
      "Para continuar recebendo os alertas ou acessar o dashboard sem delay e com ativo desbloqueados ou ter todas as funcionalidades do Agulhada.com, escolha um dos planos de assinatura a partir de R$75.00 na página de assinaturas.",
      'Se você decidir assinar os Planos "VIP" ou "Assinante" por 6 meses ou mais, use o cupom ALUNOCST24 no checkout para ganhar 50% de desconto.',
      <>Envie suas perguntas, sugestões ou problemas para <Link href={`mailto:${emailAssets.supportEmail}`}>{emailAssets.supportEmail}</Link>.</>
    ]
  },
  trialRecapture: {
    preview: "Não vai perder essa, vai?",
    heading: "Estamos te esperando!",
    subject: "Últimos dias para seus 30 dias grátis",
    footerReason: "Você recebeu este email pois é aluno do CST.",
    ctaLabel: "Quero meus 30 dias grátis",
    ctaUrl: "promo",
    includeGreeting: false,
    paragraphs: [
      <>
        Seus colegas da sua turma <strong>CST</strong> do Didi Aguiar já estão usando todos os recursos do
        Agulhada.com e recebendo <strong>alertas de agulhadas no Telegram</strong> sem pagar.
      </>,
      "Eles estão participando de uma promoção exclusiva para os alunos do CST: uma parceria entre o Didi e o Agulhada.com.",
      <>
        <strong>Você também está convidado para experimentar o Agulhada.com por 30 dias grátis.</strong>
      </>,
      <>
        Aceitando este convite, você terá acesso a todos os serviços pagos do{" "}
        <Link href={emailAssets.subscriptionUrl}>Plano VIP</Link> do Agulhada.com, sem precisar informar o seu cartão
        de crédito. Corre lá, porque a promoção está em seus últimos dias.
      </>,
      "Não deixe de aproveitar a promoção clicando no botão."
    ]
  },
  marketing30DaysCst25: {
    preview: "Não perca as agulhadas certeiras do Didi no seu Telegram!",
    heading: "30 dias GRÁTIS para testar o Agulhada.com",
    subject: "🔥 Teste o Agulhada.com GRÁTIS por 30 dias e leve seu trade apra o próximo nivel!",
    footerReason: "Você recebeu este email pois é aluno do CST.",
    ctaLabel: "Quero meus 30 dias GRÁTIS",
    ctaUrl: "promo",
    paragraphs: [
      "Pronto para turbinar seus trades com as melhores ferramentas do mercado? Temos uma novidade incrível para você, aluno do CST, em parceria com o Didi Aguiar!",
      <>
        Por tempo limitado, você foi selecionado para experimentar o <strong>Plano VIP do Agulhada.com GRÁTIS por 30 dias!</strong>{" "}
        Acesso completo a todos os recursos premium, incluindo alertas de agulhadas em tempo real no seu Telegram, sem
        gastar um centavo e sem precisar cadastrar cartão de crédito.
      </>,
      <>
        Não deixe essa chance escapar! <strong>Clique agora e garanta seus 30 dias grátis:</strong>
      </>
    ],
    listHeading: "Por que aproveitar essa oferta?",
    listItems: [
      "Receba as agulhadas do Didi direto no seu celular, enviadas pelo nosso incansável robô.",
      <>
        Acesse ferramentas exclusivas do <strong>Plano VIP</strong> para tomar decisões mais assertivas.
      </>,
      <>
        Teste tudo sem compromisso e veja como o <strong>Agulhada.com</strong> pode economizar o seu tempo e transformar
        seus resultados!
      </>
    ]
  }
} satisfies Record<string, CampaignConfig>;

export function Marketing30DaysCst(props: ReactEmailTemplateProps) {
  return <MailjetCampaign config={configs.marketing30DaysCst} {...props} />;
}

export function Marketing30Days(props: ReactEmailTemplateProps) {
  return <MailjetCampaign config={configs.marketing30Days} {...props} />;
}

export function TrialExpiring(props: ReactEmailTemplateProps) {
  return <MailjetCampaign config={configs.trialExpiring} {...props} />;
}

export function TrialExpiring50Cst24(props: ReactEmailTemplateProps) {
  return <MailjetCampaign config={configs.trialExpiring50Cst24} {...props} />;
}

export function TrialRecapture(props: ReactEmailTemplateProps) {
  return <MailjetCampaign config={configs.trialRecapture} {...props} />;
}

export function Marketing30DaysCst25(props: ReactEmailTemplateProps) {
  return <MailjetCampaign config={configs.marketing30DaysCst25} {...props} />;
}

function MailjetCampaign({ data, config }: ReactEmailTemplateProps & { config: CampaignConfig }) {
  const firstName = stringValue(data.firstName) || stringValue(data.name) || "Agulheiro";
  const email = stringValue(data.email);
  const ctaHref = config.ctaUrl === "promo" ? buildEmailUrl(emailAssets.promo30DaysUrl, email) : buildEmailUrl(emailAssets.subscriptionUrl, email);

  return (
    <EmailLayout
      preview={config.preview}
      recipientEmail={email}
      unsubscribeUrl={stringValue(data.unsubscribeUrl)}
      footerReason={config.footerReason}
    >
      <Heading style={styles.heading}>{config.heading}</Heading>
      {config.includeGreeting === false ? null : <Text style={styles.text}>Olá {firstName},</Text>}
      {config.paragraphs.map((paragraph, index) => (
        <Text key={index} style={styles.text}>{paragraph}</Text>
      ))}
      {config.listHeading ? <Heading as="h2" style={styles.subheading}>{config.listHeading}</Heading> : null}
      {config.listItems ? (
        <ul style={styles.list}>
          {config.listItems.map((item, index) => (
            <li key={index} style={styles.listItem}>{item}</li>
          ))}
        </ul>
      ) : null}
      <Section style={styles.cta}>
        <EmailButton href={ctaHref} backgroundColor="#ff6200">{config.ctaLabel}</EmailButton>
      </Section>
    </EmailLayout>
  );
}

function buildEmailUrl(baseUrl: string, email?: string): string {
  if (!email) return baseUrl;
  const url = new URL(baseUrl);
  url.searchParams.set("email", email);
  return url.toString();
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export const mailjetCampaignSubjects = {
  marketing30DaysCst: configs.marketing30DaysCst.subject,
  marketing30Days: configs.marketing30Days.subject,
  trialExpiring: configs.trialExpiring.subject,
  trialExpiring50Cst24: configs.trialExpiring50Cst24.subject,
  trialRecapture: configs.trialRecapture.subject,
  marketing30DaysCst25: configs.marketing30DaysCst25.subject
} as const;

const styles = {
  heading: {
    color: "#111827",
    fontSize: "25px",
    lineHeight: "32px",
    margin: "0 0 18px",
    textAlign: "left" as const
  },
  subheading: {
    color: "#111827",
    fontSize: "20px",
    lineHeight: "28px",
    margin: "20px 0 10px"
  },
  text: {
    color: "#374151",
    fontSize: "16px",
    lineHeight: "24px",
    margin: "0 0 16px"
  },
  list: {
    margin: "0 0 18px",
    paddingLeft: "22px"
  },
  listItem: {
    color: "#374151",
    fontSize: "16px",
    lineHeight: "24px",
    marginBottom: "10px"
  },
  cta: {
    marginTop: "24px",
    textAlign: "center" as const
  }
};
