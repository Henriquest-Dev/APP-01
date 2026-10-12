# Callout

App de previsões de cripto: a comunidade faz **calls** (sobe/desce, preço alvo, prazo), o app mostra o
consenso, um ranking dos melhores previsores e o **Score de Momentum**, uma leitura da atividade atual do
mercado. Não compra nem vende nada e **não é aconselhamento financeiro**.

Feito com React Native + [Expo](https://expo.dev) (TypeScript, Expo Router). Android primeiro, iOS depois.

## Estrutura

```
src/
  app/              ecrãs (Expo Router)
    (tabs)/         Início, Mercado, Ranking, Perfil
    coin/[id].tsx   detalhe da moeda
    call/new.tsx    criar uma call
  components/       UI reutilizável
  lib/              API de mercado, formatação, Momentum
  state/            estado global (mercado, calls)
  i18n/             textos (inglês e português)
  theme/            cores, fontes, espaçamentos
plugins/            config plugins do Expo (assinatura Android)
```

## Desenvolvimento

```bash
npm install
npm start          # abre o Expo; usa a app Expo Go ou um emulador
npm run web        # versão web, útil para ver o design rapidamente
npm run typecheck
npm run lint
```

A pasta `android/` é gerada (`expo prebuild`) e não vai para o Git. Configuração nativa fica em `app.json`
e em `plugins/`.

## Gerar o .aab para a Google Play

O `.aab` tem de ser assinado com a **chave de upload** (`callout-upload.jks`). A chave e as senhas
**nunca** vão para o repositório.

### Opção 1 — GitHub Actions (recomendado)

1. No GitHub: **Settings → Secrets and variables → Actions → New repository secret**, cria:
   - `CALLOUT_UPLOAD_KEYSTORE_BASE64` — o `.jks` em base64 (`base64 -w0 callout-upload.jks`, ou no
     Windows `[Convert]::ToBase64String([IO.File]::ReadAllBytes("callout-upload.jks"))` no PowerShell)
   - `CALLOUT_UPLOAD_STORE_PASSWORD`
   - `CALLOUT_UPLOAD_KEY_ALIAS` (`callout-upload`)
   - `CALLOUT_UPLOAD_KEY_PASSWORD`
2. **Actions → Android release (.aab) → Run workflow** (ou faz push de uma tag `v1.0.0`).
3. No fim, descarrega o artefacto `callout-release-aab`.

### Opção 2 — localmente

Precisa de Node 22, Java 21 e Android SDK.

```bash
export CALLOUT_UPLOAD_STORE_FILE=/caminho/para/callout-upload.jks
export CALLOUT_UPLOAD_STORE_PASSWORD=...
export CALLOUT_UPLOAD_KEY_ALIAS=callout-upload
export CALLOUT_UPLOAD_KEY_PASSWORD=...
npm run build:aab
# resultado: android/app/build/outputs/bundle/release/app-release.aab
```

### APK de teste (instalar direto no telemóvel)

```bash
npm run build:apk
# resultado: android/app/build/outputs/apk/release/app-release.apk (arm64, ~28 MB)
```

Usa as mesmas variáveis `CALLOUT_UPLOAD_*`. Desinstala o APK de teste antes de instalar a versão da Play Store
(as assinaturas são diferentes por causa do Play App Signing).

### Antes de cada nova versão

Aumenta `expo.android.versionCode` (1 → 2 → 3…) e `expo.version` no `app.json`. A Play Store rejeita um
`.aab` com um `versionCode` já usado.

### Primeira publicação

- Ativa o **Play App Signing** (padrão para apps novas): a Google guarda a chave final e tu só usas a chave
  de upload. Se perderes a chave de upload, podes pedir à Google para a substituir.
- O nome do pacote `com.henriquest.callout` fica **permanente** depois do primeiro upload.

## Dados

Os preços vêm por agora diretamente da API pública da CoinGecko (atualização a cada 60 s). O consenso da
comunidade e o ranking são **dados de demonstração** (marcados "DEMO") até existir o backend.
