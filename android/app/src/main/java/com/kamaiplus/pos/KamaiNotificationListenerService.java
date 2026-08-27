package com.kamaiplus.pos;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.speech.tts.TextToSpeech;
import android.util.Log;

import com.getcapacitor.JSObject;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Background Android Notification Listener Service for KamaiPlus.
 * Intercepts incoming UPI payment alerts (PhonePe, Paytm, Google Pay, BHIM, Bank SMS)
 * in the background even when screen is locked or app is minimized.
 */
public class KamaiNotificationListenerService extends NotificationListenerService {

    private static final String TAG = "KamaiUpiListener";
    private TextToSpeech textToSpeech;
    private boolean isTtsReady = false;

    // Supported Payment Apps & SMS Packages
    private static final Set<String> PAYMENT_PACKAGES = new HashSet<>(Arrays.asList(
        "com.phonepe.app",
        "com.phonepe.app.business",
        "net.one97.paytm",
        "com.paytm.business",
        "com.google.android.apps.nbu.paisa.user",
        "in.org.npci.upiapp",
        "com.sbi.upi",
        "com.google.android.apps.messaging",
        "com.android.mms",
        "com.samsung.android.messaging"
    ));

    // Financial Regex for Indian Rupee amounts: e.g. "Rs. 500", "₹500.00", "INR 500"
    private static final Pattern AMOUNT_PATTERN = Pattern.compile(
        "(?:rs\\.?|inr|₹)\\s*([\\d,]+(?:\\.\\d{1,2})?)",
        Pattern.CASE_INSENSITIVE
    );

    // 12-digit UPI UTR / RRN Reference Number
    private static final Pattern UTR_PATTERN = Pattern.compile(
        "(?:upi/|ref\\s*(?:no\\.?|num)?\\s*:?\\s*|rrn\\s*:?\\s*|utr\\s*:?\\s*)(\\d{12})",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern GENERAL_12DIGIT = Pattern.compile("\\b(\\d{12})\\b");

    private static final Set<String> PROCESSED_UTRS = new HashSet<>();

    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "KamaiNotificationListenerService initialized");

        // Initialize Android TextToSpeech for background voice box
        textToSpeech = new TextToSpeech(getApplicationContext(), status -> {
            if (status == TextToSpeech.SUCCESS) {
                int res = textToSpeech.setLanguage(new Locale("hi", "IN"));
                if (res == TextToSpeech.LANG_MISSING_DATA || res == TextToSpeech.LANG_NOT_SUPPORTED) {
                    textToSpeech.setLanguage(Locale.ENGLISH);
                }
                isTtsReady = true;
                Log.i(TAG, "Background TTS engine initialized");
            }
        });
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null) return;

        String packageName = sbn.getPackageName();
        if (packageName == null || !PAYMENT_PACKAGES.contains(packageName)) {
            return;
        }

        Notification notification = sbn.getNotification();
        if (notification == null || notification.extras == null) return;

        Bundle extras = notification.extras;
        CharSequence titleCs = extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence textCs = extras.getCharSequence(Notification.EXTRA_TEXT);
        CharSequence bigTextCs = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);

        String title = titleCs != null ? titleCs.toString() : "";
        String text = bigTextCs != null ? bigTextCs.toString() : (textCs != null ? textCs.toString() : "");

        String combined = (title + " " + text).trim();
        if (combined.isEmpty()) return;

        Log.d(TAG, "Incoming payment candidate from [" + packageName + "]: " + combined);

        // Check if CREDIT (Ignore debits or promotional notifications)
        String lower = combined.toLowerCase();
        boolean isCredit = lower.contains("credited") ||
                           lower.contains("received") ||
                           lower.contains("payment of") ||
                           lower.contains("deposited") ||
                           lower.contains("added to") ||
                           lower.contains("prapt hue") ||
                           lower.contains("sent you");

        boolean isDebit = lower.contains("debited") ||
                          lower.contains("sent to") ||
                          lower.contains("paid to") ||
                          lower.contains("withdrawn");

        if (!isCredit || (isDebit && !lower.contains("received from"))) {
            return;
        }

        // Extract Amount
        Matcher amountMatcher = AMOUNT_PATTERN.matcher(combined);
        if (!amountMatcher.find()) return;

        String amountStr = amountMatcher.group(1).replace(",", "");
        double amountRupees;
        try {
            amountRupees = Double.parseDouble(amountStr);
            if (amountRupees <= 0) return;
        } catch (Exception e) {
            return;
        }
        long amountPaise = Math.round(amountRupees * 100);

        // Extract UTR Number
        String utr = null;
        Matcher utrMatcher = UTR_PATTERN.matcher(combined);
        if (utrMatcher.find()) {
            utr = utrMatcher.group(1);
        } else {
            Matcher genMatcher = GENERAL_12DIGIT.matcher(combined);
            if (genMatcher.find()) {
                utr = genMatcher.group(1);
            }
        }

        // Deduplication
        if (utr != null && PROCESSED_UTRS.contains(utr)) {
            Log.i(TAG, "Duplicate UTR already processed: " + utr);
            return;
        }
        if (utr != null) {
            PROCESSED_UTRS.add(utr);
            if (PROCESSED_UTRS.size() > 200) {
                PROCESSED_UTRS.clear();
            }
        }

        // Identify Source App
        String sourceApp = "Generic";
        if (packageName.contains("phonepe")) {
            sourceApp = "PhonePe";
        } else if (packageName.contains("paytm")) {
            sourceApp = "Paytm";
        } else if (packageName.contains("nbu.paisa")) {
            sourceApp = "GooglePay";
        } else if (packageName.contains("upiapp")) {
            sourceApp = "BHIM";
        } else if (packageName.contains("messaging") || packageName.contains("mms")) {
            sourceApp = "BankSMS";
        }

        Log.i(TAG, "✅ Verified UPI Payment of ₹" + amountRupees + " via " + sourceApp + " (UTR: " + utr + ")");

        // 1. Speak voice announcement (Background Soundbox)
        speakPayment(amountRupees);

        // 2. Relay event to Capacitor WebView plugin
        JSObject paymentData = new JSObject();
        paymentData.put("id", "android_" + System.currentTimeMillis());
        paymentData.put("amountRupees", amountRupees);
        paymentData.put("amountPaise", amountPaise);
        paymentData.put("referenceNumber", utr != null ? utr : "");
        paymentData.put("sourceApp", sourceApp);
        paymentData.put("timestamp", System.currentTimeMillis());
        paymentData.put("rawText", combined);
        paymentData.put("isCredit", true);

        KamaiUpiPlugin.dispatchPaymentEvent(paymentData);
    }

    private void speakPayment(double amountRupees) {
        if (!isTtsReady || textToSpeech == null) return;

        try {
            long rupees = (long) amountRupees;
            String announcement = "कमई प्लस पर " + rupees + " रुपये प्राप्त हुए";
            textToSpeech.speak(announcement, TextToSpeech.QUEUE_ADD, null, "KAMAI_PAYMENT_" + System.currentTimeMillis());
        } catch (Exception e) {
            Log.e(TAG, "Failed to speak payment", e);
        }
    }

    @Override
    public void onDestroy() {
        if (textToSpeech != null) {
            textToSpeech.stop();
            textToSpeech.shutdown();
        }
        super.onDestroy();
    }
}
