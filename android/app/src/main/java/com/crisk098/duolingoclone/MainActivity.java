package com.crisk098.duolingoclone;

import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import java.util.Locale;

public class MainActivity extends BridgeActivity {
    private TextToSpeech tts;
    private boolean ttsReady = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        tts = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS) {
                ttsReady = true;
            }
        });

        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            WebSettings settings = webView.getSettings();
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setDomStorageEnabled(true);
            webView.addJavascriptInterface(new AndroidTTSInterface(), "AndroidTTS");
        }
    }

    public class AndroidTTSInterface {
        @JavascriptInterface
        public void speak(String text, String langTag, boolean slow) {
            if (!ttsReady || tts == null || text == null) {
                return;
            }
            try {
                Locale locale = Locale.forLanguageTag(langTag != null ? langTag : "en-US");
                tts.setLanguage(locale);
                tts.setSpeechRate(slow ? 0.60f : 0.96f);
                tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "duo_utt_" + System.currentTimeMillis());
            } catch (Exception ignored) {
            }
        }
    }

    @Override
    public void onDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        super.onDestroy();
    }
}
