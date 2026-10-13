import { currentLanguage } from '@/i18n';

export type LegalDoc = 'terms' | 'privacy' | 'risk';

type Doc = { title: string; updated: string; sections: { h: string; p: string }[] };

const en: Record<LegalDoc, Doc> = {
  terms: {
    title: 'Terms of Service',
    updated: 'Last updated: October 2026',
    sections: [
      {
        h: 'What Callout is',
        p: 'Callout is a community app for sharing crypto market predictions ("calls"), posts and conversations. Callout does not buy, sell, hold or transfer any asset and is not a broker, exchange or wallet.',
      },
      {
        h: 'Not financial advice',
        p: 'Everything in Callout — prices, Momentum scores, community consensus, calls, posts and messages — is information and opinion only. Nothing is investment, financial, legal or tax advice. You are solely responsible for your own decisions.',
      },
      {
        h: 'Your account',
        p: 'You must be at least 18 years old. Keep your password safe; you are responsible for activity on your account. You can delete your account at any time in Settings → Account.',
      },
      {
        h: 'Your content',
        p: 'You own what you post. By posting you allow Callout to display it inside the app. Do not post content that is illegal, hateful, harassing, sexually explicit, violent, misleading (including pump-and-dump schemes or impersonation), spam, or that infringes others’ rights.',
      },
      {
        h: 'Moderation',
        p: 'You can report content and block users from any post, comment or message. We may remove content and suspend accounts that break these rules.',
      },
      {
        h: 'Data and availability',
        p: 'Market data comes from third-party public sources and may be delayed or inaccurate. The service is provided "as is" without warranties and may change or be interrupted.',
      },
      {
        h: 'Liability',
        p: 'To the extent allowed by law, Callout is not liable for losses arising from the use of the app or reliance on any information in it.',
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    updated: 'Last updated: October 2026',
    sections: [
      {
        h: 'What we collect',
        p: 'Account data (email, display name, encrypted password handled by our authentication provider), the content you create (calls, theses, posts, images, videos, comments, messages, group memberships), reports and blocks you make, and your app preferences (language, vibration) stored on your device.',
      },
      {
        h: 'What we do not collect',
        p: 'We do not collect your contacts, location, payment details or wallet keys, and we do not sell your personal data.',
      },
      {
        h: 'How we use it',
        p: 'To run the app: sign you in, show and settle calls, build rankings and the community feed, deliver messages, and keep the community safe (spam limits, reports, blocking).',
      },
      {
        h: 'Who can see it',
        p: 'Your display name, calls, posts, comments and messages in public groups are visible to other users. Messages in private groups are visible only to members. Reports and your block list are private.',
      },
      {
        h: 'Where it is stored',
        p: 'Data is stored with our infrastructure provider (Supabase). Media you upload is stored publicly accessible by link so it can be shown in the app.',
      },
      {
        h: 'Your choices',
        p: 'You can edit your name, change your password, unblock users and permanently delete your account and data in Settings. Deleting your account removes your profile, calls, posts, comments, messages and uploaded media.',
      },
      { h: 'Children', p: 'Callout is not intended for anyone under 18.' },
    ],
  },
  risk: {
    title: 'Risk Notice',
    updated: 'Last updated: October 2026',
    sections: [
      {
        h: 'Crypto is highly risky',
        p: 'Crypto-assets are extremely volatile. Prices can fall sharply and quickly; many tokens, especially memecoins and new tokens, lose most or all of their value.',
      },
      {
        h: 'Opinions, not advice',
        p: 'Calls, consensus, rankings and Momentum scores reflect community opinion and past market activity. They do not predict the future and are not recommendations to buy or sell.',
      },
      {
        h: 'Watch for scams',
        p: 'Be wary of anyone promising guaranteed returns, asking for your seed phrase or private keys, or pushing you to buy quickly. Callout will never ask for them.',
      },
      {
        h: 'Only risk what you can lose',
        p: 'Do your own research and never invest money you cannot afford to lose.',
      },
    ],
  },
};

const pt: Record<LegalDoc, Doc> = {
  terms: {
    title: 'Termos de Serviço',
    updated: 'Última atualização: outubro de 2026',
    sections: [
      {
        h: 'O que é o Callout',
        p: 'O Callout é uma app de comunidade para partilhar previsões do mercado cripto ("calls"), posts e conversas. O Callout não compra, vende, guarda nem transfere ativos e não é uma corretora, exchange ou carteira.',
      },
      {
        h: 'Não é aconselhamento financeiro',
        p: 'Tudo no Callout — preços, Score de Momentum, consenso, calls, posts e mensagens — é apenas informação e opinião. Nada é aconselhamento de investimento, financeiro, jurídico ou fiscal. És o único responsável pelas tuas decisões.',
      },
      {
        h: 'A tua conta',
        p: 'Tens de ter pelo menos 18 anos. Guarda bem a tua senha; és responsável pela atividade na tua conta. Podes apagar a conta a qualquer momento em Definições → Conta.',
      },
      {
        h: 'O teu conteúdo',
        p: 'O que publicas é teu. Ao publicar, permites que o Callout o mostre dentro da app. Não publiques conteúdo ilegal, de ódio, assédio, sexual explícito, violento, enganador (incluindo esquemas de pump-and-dump ou fingir ser outra pessoa), spam, ou que viole direitos de terceiros.',
      },
      {
        h: 'Moderação',
        p: 'Podes denunciar conteúdo e bloquear utilizadores em qualquer post, comentário ou mensagem. Podemos remover conteúdo e suspender contas que violem estas regras.',
      },
      {
        h: 'Dados e disponibilidade',
        p: 'Os dados de mercado vêm de fontes públicas de terceiros e podem ter atraso ou erros. O serviço é fornecido "tal como está", sem garantias, e pode mudar ou ser interrompido.',
      },
      {
        h: 'Responsabilidade',
        p: 'Na medida permitida por lei, o Callout não é responsável por perdas resultantes do uso da app ou da confiança em informação nela contida.',
      },
    ],
  },
  privacy: {
    title: 'Política de Privacidade',
    updated: 'Última atualização: outubro de 2026',
    sections: [
      {
        h: 'O que recolhemos',
        p: 'Dados da conta (email, nome, senha cifrada gerida pelo nosso fornecedor de autenticação), o conteúdo que crias (calls, teses, posts, imagens, vídeos, comentários, mensagens, grupos), denúncias e bloqueios que fazes, e as tuas preferências (idioma, vibração) guardadas no teu telemóvel.',
      },
      {
        h: 'O que não recolhemos',
        p: 'Não recolhemos contactos, localização, dados de pagamento nem chaves de carteiras, e não vendemos os teus dados pessoais.',
      },
      {
        h: 'Como usamos',
        p: 'Para fazer a app funcionar: iniciar sessão, mostrar e resolver calls, criar o ranking e o feed, entregar mensagens e manter a comunidade segura (limites anti-spam, denúncias, bloqueios).',
      },
      {
        h: 'Quem vê',
        p: 'O teu nome, calls, posts, comentários e mensagens em grupos públicos são visíveis para outros utilizadores. Mensagens em grupos privados só são visíveis para os membros. Denúncias e a tua lista de bloqueados são privadas.',
      },
      {
        h: 'Onde fica guardado',
        p: 'Os dados ficam no nosso fornecedor de infraestrutura (Supabase). As imagens e vídeos que envias ficam acessíveis por link para poderem ser mostrados na app.',
      },
      {
        h: 'As tuas escolhas',
        p: 'Nas Definições podes mudar o nome e a senha, desbloquear utilizadores e apagar definitivamente a conta e os dados. Apagar a conta remove o perfil, calls, posts, comentários, mensagens e ficheiros enviados.',
      },
      { h: 'Menores', p: 'O Callout não se destina a menores de 18 anos.' },
    ],
  },
  risk: {
    title: 'Aviso de Risco',
    updated: 'Última atualização: outubro de 2026',
    sections: [
      {
        h: 'Cripto é de alto risco',
        p: 'Os criptoativos são extremamente voláteis. Os preços podem cair muito e depressa; muitos tokens, sobretudo memecoins e tokens novos, perdem quase todo ou todo o valor.',
      },
      {
        h: 'Opiniões, não conselhos',
        p: 'Calls, consenso, ranking e Score de Momentum refletem opiniões da comunidade e atividade passada do mercado. Não preveem o futuro e não são recomendações de compra ou venda.',
      },
      {
        h: 'Cuidado com burlas',
        p: 'Desconfia de quem promete lucros garantidos, pede a tua frase de recuperação ou chaves privadas, ou te pressiona a comprar à pressa. O Callout nunca as vai pedir.',
      },
      {
        h: 'Arrisca só o que podes perder',
        p: 'Faz a tua própria pesquisa e nunca invistas dinheiro que não possas perder.',
      },
    ],
  },
};

export function legalDoc(doc: LegalDoc): Doc {
  return (currentLanguage() === 'pt' ? pt : en)[doc];
}
