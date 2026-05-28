package com.reactexplore.playground;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // Ensure app content is laid out below system bars/cutouts on real devices.
    WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
  }
}
