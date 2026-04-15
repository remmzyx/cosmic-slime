package com.cosmicslime.app;

import android.os.Bundle;

import androidx.core.view.WindowCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Keep status bar (time, notifications) visible — WebView lays out below it, not under it.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    }
}
