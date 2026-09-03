package com.kamaiplus.pos;

import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.IOException;
import java.io.OutputStream;
import java.util.Set;
import java.util.UUID;

/**
 * Native Android Bluetooth ESC/POS Thermal Printer Plugin for KamaiPlus.
 * Supports standard 58mm and 80mm Bluetooth receipts via standard SPP (Serial Port Profile).
 */
@CapacitorPlugin(name = "KamaiBluetoothPrinterPlugin")
public class KamaiBluetoothPrinterPlugin extends Plugin {

    private static final String TAG = "KamaiBtPrinter";
    // Standard Bluetooth Serial Port Profile (SPP) UUID for Thermal POS Printers
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    private BluetoothAdapter bluetoothAdapter;
    private BluetoothSocket bluetoothSocket;
    private OutputStream outputStream;
    private String connectedDeviceName = null;
    private String connectedDeviceAddress = null;

    @Override
    public void load() {
        super.load();
        bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
        Log.i(TAG, "KamaiBluetoothPrinterPlugin initialized.");
    }

    @PluginMethod
    public void isSupported(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("supported", bluetoothAdapter != null);
        call.resolve(ret);
    }

    @PluginMethod
    public void isBluetoothEnabled(PluginCall call) {
        JSObject ret = new JSObject();
        boolean enabled = (bluetoothAdapter != null && bluetoothAdapter.isEnabled());
        ret.put("enabled", enabled);
        call.resolve(ret);
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    public void listBondedPrinters(PluginCall call) {
        if (bluetoothAdapter == null) {
            call.reject("Bluetooth is not supported on this device.");
            return;
        }

        if (!bluetoothAdapter.isEnabled()) {
            call.reject("Bluetooth is turned off. Please enable Bluetooth in Settings.");
            return;
        }

        try {
            Set<BluetoothDevice> pairedDevices = bluetoothAdapter.getBondedDevices();
            JSArray deviceList = new JSArray();

            if (pairedDevices != null) {
                for (BluetoothDevice device : pairedDevices) {
                    JSObject devObj = new JSObject();
                    String name = device.getName();
                    devObj.put("name", name != null ? name : "Thermal Printer");
                    devObj.put("address", device.getAddress());
                    devObj.put("bonded", true);
                    deviceList.put(devObj);
                }
            }

            JSObject ret = new JSObject();
            ret.put("devices", deviceList);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error listing paired Bluetooth printers", e);
            call.reject("Failed to list paired printers: " + e.getMessage());
        }
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    public void connect(PluginCall call) {
        String address = call.getString("address");
        if (address == null || address.trim().isEmpty()) {
            call.reject("Printer MAC address is required.");
            return;
        }

        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) {
            call.reject("Bluetooth is unavailable or disabled.");
            return;
        }

        // Close any existing connection first
        disconnectInternal();

        try {
            BluetoothDevice device = bluetoothAdapter.getRemoteDevice(address);
            bluetoothAdapter.cancelDiscovery();

            bluetoothSocket = device.createRfcommSocketToServiceRecord(SPP_UUID);
            bluetoothSocket.connect();
            outputStream = bluetoothSocket.getOutputStream();

            connectedDeviceName = device.getName() != null ? device.getName() : "Thermal Printer";
            connectedDeviceAddress = address;

            Log.i(TAG, "Successfully connected to Bluetooth printer: " + connectedDeviceName + " (" + address + ")");

            JSObject ret = new JSObject();
            ret.put("connected", true);
            ret.put("name", connectedDeviceName);
            ret.put("address", connectedDeviceAddress);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Connection failed to " + address, e);
            disconnectInternal();
            call.reject("Could not connect to printer: " + e.getMessage());
        }
    }

    @PluginMethod
    public void printRaw(PluginCall call) {
        String base64Data = call.getString("data");
        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("No print data provided.");
            return;
        }

        if (bluetoothSocket == null || !bluetoothSocket.isConnected() || outputStream == null) {
            call.reject("Printer is not connected.");
            return;
        }

        try {
            byte[] rawBytes = Base64.decode(base64Data, Base64.DEFAULT);
            outputStream.write(rawBytes);
            outputStream.flush();

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("bytesPrinted", rawBytes.length);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Failed to write print data", e);
            call.reject("Failed to print: " + e.getMessage());
        }
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        disconnectInternal();
        JSObject ret = new JSObject();
        ret.put("connected", false);
        call.resolve(ret);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        boolean isConnected = (bluetoothSocket != null && bluetoothSocket.isConnected() && outputStream != null);
        JSObject ret = new JSObject();
        ret.put("connected", isConnected);
        ret.put("name", isConnected ? connectedDeviceName : null);
        ret.put("address", isConnected ? connectedDeviceAddress : null);
        call.resolve(ret);
    }

    private void disconnectInternal() {
        try {
            if (outputStream != null) {
                outputStream.close();
                outputStream = null;
            }
        } catch (IOException ignored) {}

        try {
            if (bluetoothSocket != null) {
                bluetoothSocket.close();
                bluetoothSocket = null;
            }
        } catch (IOException ignored) {}

        connectedDeviceName = null;
        connectedDeviceAddress = null;
    }

    @Override
    public void handleOnDestroy() {
        disconnectInternal();
        super.handleOnDestroy();
    }
}
