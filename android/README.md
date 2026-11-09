# Duolingo Clone — Android (`com.crisk098.duolingoclone`)

## Download Direto do APK
- **[Baixar `Duolingo-Clone.apk` (GitHub Release v1.0.0)](https://github.com/crisk098/Duolingo-Clone/releases/download/v1.0.0/Duolingo-Clone.apk)**
- Caminho local após compilação: `android/Duolingo-Clone.apk` e `android/app/build/outputs/apk/debug/app-debug.apk`

> **Nota sobre o Git**: Por diretriz de repositório (*never commit binaries*), arquivos binários `.apk` não são versionados diretamente na árvore Git, sendo disponibilizados em `android/Duolingo-Clone.apk` no ambiente local e anexados em **[GitHub Releases](https://github.com/crisk098/Duolingo-Clone/releases/tag/v1.0.0)**.

## Como Compilar o APK (`npm run android:apk`)
Na raiz do projeto, execute:

```bash
npm run android:apk
```

O script [`scripts/build-android-apk.sh`](../scripts/build-android-apk.sh) executa automaticamente:
1. Build da aplicação Web (`tsc -b && vite build`) e sincronização com o Capacitor (`npx cap sync android`).
2. Provisionamento automático do Android SDK 35 e Build-Tools (`34.0.0` e `35.0.0`) caso não estejam instalados.
3. Compilação `./gradlew assembleDebug` e cópia do APK assinado para `android/Duolingo-Clone.apk`.
