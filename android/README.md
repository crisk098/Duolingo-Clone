# Duolingo Clone — Android (`com.crisk098.duolingoclone`)

## Download Direto do APK no GitHub
- **[Baixar `Duolingo-Clone.apk` (GitHub Release v1.0.0)](https://github.com/crisk098/Duolingo-Clone/releases/download/v1.0.0/Duolingo-Clone.apk)**
- **[Página da Release v1.0.0 no GitHub](https://github.com/crisk098/Duolingo-Clone/releases/tag/v1.0.0)**
- **[GitHub Actions Artifacts (`Build & Publish Android APK`)](https://github.com/crisk098/Duolingo-Clone/actions)**

## Localização do APK no Workspace
- **Na pasta `android/`**: [`android/Duolingo-Clone.apk`](./Duolingo-Clone.apk)
- **No diretório de build do Gradle**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **No Preview Web**: disponível no botão **"Baixar APK"** no topo da aplicação (`/Duolingo-Clone.apk`).

## Como Compilar Localmente (`npm run android:apk`)
Na raiz do repositório, execute:

```bash
npm run android:apk
```

O script [`scripts/build-android-apk.sh`](../scripts/build-android-apk.sh) executa automaticamente:
1. Build da aplicação Web (`tsc -b && vite build`) e sincronização com o Capacitor (`npx cap sync android`).
2. Provisionamento automático do Android SDK 35 e Build-Tools (`34.0.0` e `35.0.0`) caso não estejam instalados.
3. Compilação `./gradlew assembleDebug` e geração do APK assinado em `android/Duolingo-Clone.apk`.
