package com.kamaiplus.pos;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.provider.Settings;
import android.speech.tts.TextToSpeech;
import android.text.TextUtils;
import android.util.Log;

import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Locale;
import java.util.Set;

@CapacitorPlugin(name = "KamaiUpiPlugin")
public class KamaiUpiPlugin extends Plugin {

    private static final String TAG = "KamaiUpiPlugin";
    private static KamaiUpiPlugin instance;
    private TextToSpeech textToSpeech;
    private boolean isTtsReady = false;

    @Override
    public void load() {
        super.load();
        instance = this;

        // Initialize Native TTS for on-demand speech triggers from Web
        textToSpeech = new TextToSpeech(getContext(), status -> {
            if (status == TextToSpeech.SUCCESS) {
                int res = textToSpeech.setLanguage(new Locale("hi", "IN"));
                if (res == TextToSpeech.LANG_MISSING_DATA || res == TextToSpeech.LANG_NOT_SUPPORTED) {
                    textToSpeech.setLanguage(Locale.ENGLISH);
                }
                isTtsReady = true;
            }
        });

        Log.i(TAG, "KamaiUpiPlugin loaded into Capacitor bridge");
    }

    /**
     * Check if Android Notification Access permission is granted to KamaiPlus
     */
    @PluginMethod
    public void isNotificationListenerEnabled(PluginCall call) {
        Context context = getContext();
        Set<String> packageNames = NotificationManagerCompat.getEnabledListenerPackages(context);
        boolean isEnabled = packageNames.contains(context.getPackageName());

        JSObject ret = new JSObject();
        ret.put("enabled", isEnabled);
        ret.put("packageName", context.getPackageName());
        call.resolve(ret);
    }

    /**
     * Deep link merchant directly to Android Notification Access settings screen
     */
    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to open notification settings", e);
        }
    }

    /**
     * Native TextToSpeech trigger from POS UI
     */
    @PluginMethod
    public void speakPayment(PluginCall call) {
        Double amount = call.getDouble("amount", 0.0);
        String language = call.getString("language", "hi");

        if (textToSpeech != null && isTtsReady) {
            try {
                if ("mr".equalsIgnoreCase(language)) {
                    textToSpeech.setLanguage(new Locale("mr", "IN"));
                    textToSpeech.speak("कमई प्लस वर " + amount.longValue() + " रुपये प्राप्त झाले", TextToSpeech.QUEUE_FLUSH, null, "KAMAI_TTS");
                } else if ("en".equalsIgnoreCase(language)) {
                    textToSpeech.setLanguage(Locale.ENGLISH);
                    textToSpeech.speak("Received " + amount.longValue() + " rupees on KamaiPlus", TextToSpeech.QUEUE_FLUSH, null, "KAMAI_TTS");
                } else {
                    textToSpeech.setLanguage(new Locale("hi", "IN"));
                    textToSpeech.speak("कमई प्लस पर " + amount.longValue() + " रुपये प्राप्त हुए", TextToSpeech.QUEUE_FLUSH, null, "KAMAI_TTS");
                }
            } catch (Exception ignored) {}
        }

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    /**
     * Dispatch event to active Capacitor web listeners
     */
    public static void dispatchPaymentEvent(JSObject paymentData) {
        if (instance != null) {
            instance.notifyListeners("onPaymentReceived", paymentData);
            Log.i(TAG, "Dispatched onPaymentReceived to Web runtime: " + paymentData.toString());
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (textToSpeech != null) {
            textToSpeech.stop();
            textToSpeech.shutdown();
        }
        super.handleOnDestroy();
    }
}
