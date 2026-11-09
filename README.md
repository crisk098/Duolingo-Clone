# 🦉 Duolingo Clone (`/learn` v1.340.0) — Reconstrução via REA

Reescrita completa em **React + TypeScript + Vite + CSS Moderno** do aplicativo web do Duolingo (`https://www.duolingo.com/learn`), fundamentada nas evidências extraídas pela ferramenta de engenharia reversa **REA (`rea-agents@6.8.0`)**.

---

## 🔬 Proveniência de Engenharia Reversa (REA Evidence)

- **Operação REA:** `analyze_javascript_application` (`--detail summary` + bundle completo)
- **Parent Evidence ID:** `ev_b3e85d5c982c898b9332a0703b112755f41a4962d327265da5d89de9cd64adb8`
- **Summary View Evidence ID:** `ev_356ddaa72dcf9d8b24ffb002dbd698b7f9a9d041878ab7a7b10eb78267fe1a8d`
- **Route Inventory ID:** `jsri:5e576fdb4e8195d1bbc49bf3e979d23f837a227333d1a7a0089c4c1dd52f84ba`
- **Artifact Root SHA-256:** `ad3b2b1c3505c61bccd69bb5ca297a759272a91c2e137acbbea7a0d3d34e144c`
- **Versão observada do Duolingo Web:** `1.340.0` (`589f82ebf9eeee092b1ce17f3882377ed48e5d55`)
- **Estatísticas do Grafo Estático:**
  - **8 bundles JS** analisados (`manifest-9fc0e81f.js`, `features-91ec4487.js`, `app-cfde5392.js`, `path-4d01b0f9.js`, `pathSections-a7313556.js`, `session-a04d9575.js`, `homePage-4be75ad9.js`, `settingsPage-446e1426.js`) + folhas de estilo (`app-f58b2376.css`, `path-4f5df80c.css`)
  - **360.967 nós AST** inspecionados
  - **1.263 módulos JS** e **222 chunks Webpack** mapeados
  - **132 rotas únicas** e **289 nós de endpoint** extraídos

---

## ✨ Modos e Funcionalidades Implementados

1. **Autenticação e Onboarding (`/login`, `/register`, Conta Google):**
   - Seletor rápido de **Conta Google** (ou inserção de qualquer e-mail/nome Google personalizado) e cadastro/login por **E-mail e Senha**.
   - Seletor de cursos com 4 idiomas completos: **Inglês 🇺🇸**, **Espanhol 🇪🇸**, **Francês 🇫🇷** e **Japonês 🇯🇵**.
2. **Trilha de Aprendizado (`/learn` & `/sections`):**
   - Cabeçalhos de unidade coloridos com mascotes (`Duo`, `Bea`, `Lily`, `Oscar`, `Zari`) e botão **Guia (`Guidebook`)** com áudio TTS e tabelas gramaticais.
   - Trilha senoidal com níveis (`skill`), anel de progresso circular SVG, **Baús de Gemas (`path-chest`)**, **Histórias na Trilha (`story`)**, **Teste de Pulo de Unidade (`unit_test`)** e **Modo Lendário Dourado (`legendary-gold`)**.
3. **Motor de Lições Interativas (`/lesson/unit/:u/level/:l`):**
   - Suporte aos tipos de exercício extraídos de `app-cfde5392.js`:
     - `select` (escolha de cartões ilustrados com pronúncia TTS)
     - `translate` (tradução com banco de palavras clicável **ou** alternância para digitação via teclado + dicas pontilhadas `wordHints` ao clicar nas palavras)
     - `assist` (múltipla escolha contextual)
     - `match` / `characterMatch` (combinar pares de palavras ou caracteres com feedback sonoro)
     - `listenTap` (compreensão auditiva com áudio normal `🔊` e velocidade tartaruga `🐢`)
     - `speak` (exercício de fala com reconhecimento e opção "Não posso falar agora")
     - `dialogue` (diálogo entre personagens)
     - `completeReverseTranslation` (completar lacunas)
   - Re-enfileiramento automático de erros no final da lição e envio para a Caixa de Erros.
4. **Sons e Caracteres (`/alphabets/:lang/tips`):**
   - Vogais e consoantes fonéticas (IPA) para Inglês, Espanhol e Francês, e tabela de **Hiragana e Katakana** para Japonês com áudio TTS e sessão prática.
5. **Duolingo Stories (`/stories/:storyId`):**
   - Histórias interativas narradas linha a linha com áudio TTS, botão de tradução e perguntas de compreensão no meio da história.
6. **Hub de Prática (`/practice-hub` & `/words`):**
   - **Revisão de Erros (`mistakes`)**, **Prática para Recuperar +1 Vida (`❤️`)** e **Inventário de Vocabulário (`words`)** com barra de força e pronúncia.
7. **Gamificação Completa (`/leaderboard`, `/quests`, `/shop`, `/profile`):**
   - **Ligas Semanais (Divisão Diamante)** com Zona de Promoção dinâmica.
   - **Missões Diárias e Desafio Mensal** com resgate de Gemas (`💎`).
   - **Loja (`Shop`)** com Recarga de Vidas, Bloqueio de Ofensiva (`🧊`), Aposta Dobro ou Nada (`🔥`), Poção de 2x XP (`⚡`) e **Super Duolingo (`👑 Vidas Infinitas ♾️`)**.
   - **REA Inspector (`🔬`)** integrado na barra lateral para inspecionar os dados brutos da engenharia reversa.

---

## 🚀 Como Executar

```bash
npm install
npm run dev
```
