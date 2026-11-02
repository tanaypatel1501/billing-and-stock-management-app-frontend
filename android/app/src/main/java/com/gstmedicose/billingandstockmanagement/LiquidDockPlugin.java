package com.gstmedicose.billingandstockmanagement;

import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import androidx.core.graphics.PathParser;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "LiquidDock")
public class LiquidDockPlugin extends Plugin {

    private LiquidDockView dock;

    @PluginMethod
    public void show(PluginCall call) {
        final JSArray arr = call.getArray("items");
        final String activeId = call.getString("activeId", "");
        final boolean dark = Boolean.TRUE.equals(call.getBoolean("dark", false));
        final boolean menuOpen = Boolean.TRUE.equals(call.getBoolean("menuOpen", false));
        if (arr == null) {
            call.reject("items missing");
            return;
        }
        getActivity().runOnUiThread(() -> {
            try {
                List<LiquidDockView.Item> list = parse(arr);
                ensureDock();
                dock.setDockVisible(true);
                dock.setMenuOpen(menuOpen);
                dock.setItems(list, activeId, dark);
                call.resolve();
            } catch (Exception e) {
                call.reject("LiquidDock.show failed: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void hide(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (dock != null) dock.setDockVisible(false);
            call.resolve();
        });
    }

    private void ensureDock() {
        if (dock != null) return;
        ViewGroup content = getActivity().findViewById(android.R.id.content);
        dock = new LiquidDockView(getContext());
        dock.setBackdropSource(getBridge().getWebView());
        dock.setListener(id -> {
            JSObject data = new JSObject();
            data.put("id", id);
            notifyListeners("itemTap", data);
        });
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                Gravity.BOTTOM);
        content.addView(dock, lp);
    }

    private List<LiquidDockView.Item> parse(JSArray arr) throws JSONException {
        List<LiquidDockView.Item> out = new ArrayList<>();
        for (int i = 0; i < arr.length(); i++) {
            JSONObject o = arr.getJSONObject(i);
            LiquidDockView.Item it = new LiquidDockView.Item();
            it.id = o.getString("id");
            it.label = o.optString("label", "");
            it.w = (float) o.optDouble("w", 512);
            it.h = (float) o.optDouble("h", 512);
            it.path = PathParser.createPathFromPathData(o.getString("path"));
            it.badge = o.optInt("badge", 0);
            it.disabled = o.optBoolean("disabled", false);
            it.selectable = o.optBoolean("selectable", true);
            out.add(it);
        }
        return out;
    }
}