package com.kamaiplus.pos;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(KamaiUpiPlugin.class);
        registerPlugin(KamaiBluetoothPrinterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
