# Sistema de Prospecção Autônomo - Mart Digital

Este guia descreve como configurar e rodar o sistema de prospecção autônomo do Instagram localmente.

## Requisitos

- Node.js 24+
- pnpm (gerenciador de pacotes)
- Google Chrome instalado
- Conta OpenAI com créditos/cartão cadastrado
- Aplicativo Meta Developers configurado (opcional para testes iniciais)

## Passo 1: Instalação

Abra o terminal na pasta do projeto e rode:

```bash
pnpm install
```

## Passo 2: Configuração de Variáveis de Ambiente

Copie o arquivo de exemplo para criar o seu `.env`:

```bash
cp .env.example .env
```

Preencha as variáveis principais:
- `DATABASE_URL`: Deixe como `./data/prospector.db`
- `OPENAI_API_KEY`: Sua chave de API da OpenAI
- `CHROME_CDP_URL`: Normalmente `http://127.0.0.1:9222`

## Passo 3: Preparar o Chrome para Automação

O sistema usa o navegador Chrome para enviar as primeiras mensagens (contornando a limitação da API oficial do Instagram, que não permite iniciar conversas).

**IMPORTANTE:** Você precisa criar um perfil dedicado do Chrome e iniciá-lo com a porta de depuração aberta antes de ligar o sistema.

**No Windows:**
Crie um atalho na área de trabalho para o Chrome com o seguinte "Destino":
`"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\ChromeProfiles\automation" --no-first-run --no-default-browser-check`

Abra este Chrome, entre no [instagram.com](https://instagram.com) e faça o login com a conta da Mart Digital. Deixe esta janela aberta.

## Passo 4: Inicializar o Banco de Dados

Rode o script de migração para criar as tabelas SQLite:

```bash
pnpm tsx src/db/migrate.ts
```

## Passo 5: Rodar o Sistema

O sistema possui duas partes: o painel frontend (Next.js) e o worker (processo em segundo plano que executa as tarefas).

Para rodar ambos simultaneamente:

```bash
pnpm run dev:all
```

Acesse o painel em: `http://localhost:3000`

## Funcionalidades do Painel

- **Dashboard:** Visão geral das métricas e alertas do sistema.
- **Leads:** Visualização Kanban do funil de vendas.
- **Conversas:** Acompanhamento do que a IA está respondendo.
- **Configurações:** Verifique se o navegador está conectado e configure os disjuntores (Circuit Breakers).

## (Opcional) Passo 6: Integração com a API Oficial

Para usar a API Oficial do Instagram (o que permite respostas em segundo plano sem depender do navegador aberto):
1. Configure um App no Meta for Developers
2. Preencha `INSTAGRAM_PAGE_ID`, `INSTAGRAM_APP_SECRET` e `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` no seu `.env`
3. Configure a URL do webhook no painel da Meta para `https://seu-dominio.com/api/webhook/instagram` (usando ngrok para desenvolvimento local)
4. Assine os campos de `messages`.
