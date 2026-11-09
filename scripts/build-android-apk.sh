#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> [1/3] Building web application and syncing Capacitor Android..."
rm -f "$ROOT_DIR/public/Duolingo-Clone.apk" "$ROOT_DIR/android/app/src/main/assets/public/Duolingo-Clone.apk"
npm run android:sync

# Normalize generated Capacitor Gradle files to Java 17 for JDK 17 compatibility
for f in \
  "$ROOT_DIR/android/app/capacitor.build.gradle" \
  "$ROOT_DIR/android/capacitor-cordova-android-plugins/build.gradle" \
  "$ROOT_DIR/node_modules/@capacitor/android/capacitor/build.gradle"; do
  if [ -f "$f" ]; then
    sed -i 's/VERSION_21/VERSION_17/g' "$f"
  fi
done

SDK_DIR="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-/tmp/android-sdk}}"

if [ ! -f "$SDK_DIR/platforms/android-35/package.xml" ] || [ ! -f "$SDK_DIR/build-tools/35.0.0/package.xml" ] || [ ! -f "$SDK_DIR/build-tools/34.0.0/package.xml" ]; then
  echo "==> [2/3] Installing Android SDK 35 & Build-Tools (34.0.0, 35.0.0) in $SDK_DIR..."
  [ ! -f "$SDK_DIR/build-tools/34.0.0/package.xml" ] && rm -rf "$SDK_DIR/build-tools/34.0.0"
  mkdir -p "$SDK_DIR/cmdline-tools"
  if [ ! -f "$SDK_DIR/cmdline-tools/latest/bin/sdkmanager" ]; then
    curl -sSL https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -o /tmp/cmdtools.zip
    python3 -m zipfile -e /tmp/cmdtools.zip "$SDK_DIR/cmdline-tools"
    mv "$SDK_DIR/cmdline-tools/cmdline-tools" "$SDK_DIR/cmdline-tools/latest"
    chmod -R +x "$SDK_DIR/cmdline-tools/latest/bin"
    rm -f /tmp/cmdtools.zip
  fi

  PROXY_ARGS=()
  if [ -n "${HTTP_PROXY:-}" ]; then
    PROXY_HOST="$(echo "$HTTP_PROXY" | sed -E 's#^https?://([^:/]+).*#\1#')"
    PROXY_PORT="$(echo "$HTTP_PROXY" | sed -E 's#^https?://[^:/]+:([0-9]+).*#\1#')"
    PROXY_ARGS=(--no_https --proxy=http "--proxy_host=$PROXY_HOST" "--proxy_port=$PROXY_PORT")
  fi

  yes | "$SDK_DIR/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$SDK_DIR" "${PROXY_ARGS[@]}" --licenses >/dev/null 2>&1 || true
  "$SDK_DIR/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$SDK_DIR" "${PROXY_ARGS[@]}" "platform-tools" "platforms;android-35" "build-tools;34.0.0" "build-tools;35.0.0"
fi

echo "sdk.dir=$SDK_DIR" > "$ROOT_DIR/android/local.properties"

if [ -f /etc/ssl/certs/ca-certificates.crt ] && [ ! -f /tmp/java-cacerts ]; then
  python3 -c '
import re, subprocess, tempfile, os
with open("/etc/ssl/certs/ca-certificates.crt") as f:
    pem = f.read()
certs = re.findall(r"-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----", pem, re.S)
for idx, c in enumerate(certs[-10:]):
    with tempfile.NamedTemporaryFile("w", delete=False) as tf:
        tf.write(c)
        tname = tf.name
    subprocess.run(["keytool", "-importcert", "-noprompt", "-keystore", "/tmp/java-cacerts", "-storepass", "changeit", "-alias", f"ca-{idx}", "-file", tname], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.remove(tname)
'
fi

echo "==> [3/3] Running Gradle assembleDebug..."
cd "$ROOT_DIR/android"
chmod +x ./gradlew

if [ -n "${HTTP_PROXY:-}" ] && [ -f /tmp/java-cacerts ]; then
  PROXY_HOST="$(echo "$HTTP_PROXY" | sed -E 's#^https?://([^:/]+).*#\1#')"
  PROXY_PORT="$(echo "$HTTP_PROXY" | sed -E 's#^https?://[^:/]+:([0-9]+).*#\1#')"
  export JAVA_TOOL_OPTIONS="-Dhttp.proxyHost=$PROXY_HOST -Dhttp.proxyPort=$PROXY_PORT -Dhttps.proxyHost=$PROXY_HOST -Dhttps.proxyPort=$PROXY_PORT -Djavax.net.ssl.trustStore=/tmp/java-cacerts -Djavax.net.ssl.trustStorePassword=changeit"
fi

./gradlew assembleDebug --no-daemon

cp "$ROOT_DIR/android/app/build/outputs/apk/debug/app-debug.apk" "$ROOT_DIR/Duolingo-Clone.apk"
cp "$ROOT_DIR/android/app/build/outputs/apk/debug/app-debug.apk" "$ROOT_DIR/public/Duolingo-Clone.apk"

echo "==> APK generated successfully:"
ls -lh "$ROOT_DIR/Duolingo-Clone.apk" "$ROOT_DIR/android/app/build/outputs/apk/debug/app-debug.apk"
