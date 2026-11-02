package com.gstmedicose.billingandstockmanagement;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.ColorMatrix;
import android.graphics.ColorMatrixColorFilter;
import android.graphics.LinearGradient;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RecordingCanvas;
import android.graphics.RectF;
import android.graphics.RenderEffect;
import android.graphics.RenderNode;
import android.graphics.RuntimeShader;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.graphics.Rect;
import android.os.Build;
import android.os.SystemClock;
import android.view.HapticFeedbackConstants;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewTreeObserver;

import androidx.annotation.RequiresApi;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import java.util.ArrayList;
import java.util.List;

public class LiquidDockView extends View {

    /** Set to false to see the plain frosted fallback (no WebView capture). */
    private static final boolean ENABLE_BACKDROP = true;
    private static final float BACKDROP_SATURATION = 0.7f;
    private static final int WASH_LIGHT = 0x66F2F2F7;
    private static final int WASH_DARK  = 0x66141416;

    public interface Listener { void onItemTap(String id); }

    public static class Item {
        public String id, label;
        public Path path;
        public float w, h;
        public int badge;
        public boolean disabled;
        public boolean selectable = true;
    }

    private static class Spring {
        float value, velocity, target;

        void step(float dt, float response, float damping) {
            float w = (float) (2 * Math.PI / response);
            int n = Math.max(1, (int) Math.ceil(dt * 240f));
            float sub = dt / n;
            for (int i = 0; i < n; i++) {
                float a = -(w * w) * (value - target) - 2f * damping * w * velocity;
                velocity += a * sub;
                value += velocity * sub;
            }
        }

        boolean settle(float eps) {
            if (Math.abs(value - target) < eps && Math.abs(velocity) < eps * 20f) {
                value = target;
                velocity = 0f;
                return true;
            }
            return false;
        }
    }

    // AGSL: magnifies the centre and bends the rim, with a touch of colour fringing.
    private static final String LENS_AGSL =
        "uniform shader content;\n" +
        "uniform float2 center;\n" +
        "uniform float2 halfSize;\n" +
        "uniform float radius;\n" +
        "uniform float mag;\n" +
        "float sdRoundBox(float2 p, float2 b, float r) {\n" +
        "  float2 q = abs(p) - b + float2(r);\n" +
        "  return min(max(q.x, q.y), 0.0) + length(max(q, float2(0.0))) - r;\n" +
        "}\n" +
        "half4 main(float2 fragCoord) {\n" +
        "  float2 p = fragCoord - center;\n" +
        "  float d = sdRoundBox(p, halfSize, radius);\n" +
        "  if (d > 0.0) { return content.eval(fragCoord); }\n" +
        "  float depth = clamp(-d / (radius * 0.85), 0.0, 1.0);\n" +
        "  float rim = 1.0 - depth;\n" +
        "  rim = rim * rim * rim;\n" +
        "  float s = 1.0 / mag + rim * (1.0 - 1.0 / mag + 0.45);\n" +
        "  float2 uv = center + p * s;\n" +
        "  float2 dir = normalize(p + float2(0.001));\n" +
        "  half4 col;\n" +
        "  col.r = content.eval(uv + dir * rim * 2.0).r;\n" +
        "  col.g = content.eval(uv).g;\n" +
        "  col.b = content.eval(uv - dir * rim * 2.0).b;\n" +
        "  col.a = 1.0;\n" +
        "  return col;\n" +
        "}\n";

    private final float dp;
    private final List<Item> items = new ArrayList<>();
    private int activeIndex = -1;
    private int hoverIndex = -1;
    private boolean dark;
    private boolean touching;
    private boolean menuOpen;
    private boolean wantVisible = true;      
    private boolean keyboardVisible;          
    private final Rect visibleFrame = new Rect();
    private final ViewTreeObserver.OnGlobalLayoutListener keyboardListener = this::checkKeyboard;
    private long captureHoldUntil;
    private final Runnable releaseHold = this::kick;
    private boolean selInit;
    private Listener listener;
    private View backdropSource;

    private final RectF pill = new RectF();
    private final RectF lens = new RectF();
    private final Path tmpPath = new Path();
    private final Path iconPath = new Path();
    private final Matrix tmpMatrix = new Matrix();
    private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint textP = new Paint(Paint.ANTI_ALIAS_FLAG);

    private final Spring lensX = new Spring();
    private final Spring presence = new Spring();
    private final Spring selX = new Spring();
    private long lastFrameNanos;

    // theme colours
    private int iconColor, accentColor, capsuleColor, lensBase, lensTint, lensHi, rimA, rimB, rimC;
    private Shader bodyShader, rimShader;
    private boolean shadersDirty = true;
    private boolean shaderBackdropMode = false;

    // backdrop (API 31+)
    private boolean backdropBroken;
    private RenderNode srcNode, blurNode, lensNode;
    private RuntimeShader lensShader;

    private final ViewTreeObserver.OnScrollChangedListener scrollListener = this::invalidate;
    private final Runnable idleRefresh = new Runnable() {
        @Override public void run() {
            if (getVisibility() == VISIBLE) invalidate();
            postDelayed(this, 500);
        }
    };

    public LiquidDockView(Context context) {
        super(context);
        dp = context.getResources().getDisplayMetrics().density;
        textP.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        textP.setTextAlign(Paint.Align.CENTER);
        applyTheme();
        ViewCompat.setOnApplyWindowInsetsListener(this, (v, insets) -> {
            int b = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom;
            if (b != v.getPaddingBottom()) v.setPadding(0, 0, 0, b);
            return insets;
        });
    }

    // ------------------------------------------------------------------ API

    public void setListener(Listener l) { listener = l; }

    public void setBackdropSource(View v) { backdropSource = v; }

    public void setItems(List<Item> list, String activeId, boolean isDark) {
        items.clear();
        items.addAll(list);
        activeIndex = -1;
        for (int i = 0; i < items.size(); i++) {
            if (items.get(i).id.equals(activeId)) activeIndex = i;
        }
        if (dark != isDark) {
            dark = isDark;
            applyTheme();
            shadersDirty = true;
            holdCapture(900);
        }
        kick();
    }

    public void setMenuOpen(boolean open) {
        if (menuOpen != open) {
            menuOpen = open;
            shadersDirty = true;
            kick();
        }
    }

    public void setDockVisible(boolean visible) {
        wantVisible = visible;
        applyVisibility();
    }

    private void applyVisibility() {
        int target = (wantVisible && !keyboardVisible) ? VISIBLE : GONE;
        if (getVisibility() != target) setVisibility(target);
        if (target == VISIBLE) kick();
    }

    private void checkKeyboard() {
        View root = getRootView();
        if (root == null) return;
        root.getWindowVisibleDisplayFrame(visibleFrame);
        int total = root.getHeight();
        boolean open = total > 0 && (total - visibleFrame.bottom) > total * 0.15f;
        if (open != keyboardVisible) {
            keyboardVisible = open;
            if (!open) holdCapture(400); 
            applyVisibility();
        }
    }

    private void holdCapture(long ms) {
        captureHoldUntil = SystemClock.uptimeMillis() + ms;
        removeCallbacks(releaseHold);
        postDelayed(releaseHold, ms + 50);
    }

    // --------------------------------------------------------------- layout

    @Override
    protected void onMeasure(int wSpec, int hSpec) {
        setMeasuredDimension(MeasureSpec.getSize(wSpec), (int) (92 * dp) + getPaddingBottom());
    }

    private void computePill() {
        float m = 16 * dp;
        float bottom = getHeight() - getPaddingBottom() - 10 * dp;
        float l = m, t = bottom - 64 * dp, r = getWidth() - m;
        if (pill.left != l || pill.top != t || pill.right != r || pill.bottom != bottom) {
            pill.set(l, t, r, bottom);
            shadersDirty = true;
        }
    }

    private float pad() { return 6 * dp; }
    private float slotW() { return (pill.width() - 2 * pad()) / Math.max(1, items.size()); }
    private float slotCenter(int i) { return pill.left + pad() + slotW() * (i + 0.5f); }

    private int indexAt(float x) {
        int i = (int) ((x - pill.left - pad()) / slotW());
        return Math.max(0, Math.min(items.size() - 1, i));
    }

    private float clampLensX(float x) {
        float half = slotW() / 2f;
        return Math.max(pill.left + pad() + half, Math.min(pill.right - pad() - half, x));
    }

    // ---------------------------------------------------------------- touch

    @Override
    public boolean onTouchEvent(MotionEvent e) {
        computePill();
        switch (e.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                if (items.isEmpty()
                        || e.getX() < pill.left || e.getX() > pill.right
                        || e.getY() < pill.top - 12 * dp || e.getY() > pill.bottom + 12 * dp) {
                    return false; // let the WebView underneath handle it
                }
                touching = true;
                if (getParent() != null) getParent().requestDisallowInterceptTouchEvent(true);
                if (presence.value < 0.05f) {
                    lensX.value = (selInit && activeIndex >= 0) ? selX.value : clampLensX(e.getX());
                    lensX.velocity = 0f;
                }
                lensX.target = clampLensX(e.getX());
                presence.target = 1f;
                hoverIndex = indexAt(e.getX());
                kick();
                return true;
            case MotionEvent.ACTION_MOVE:
                if (!touching) return false;
                lensX.target = clampLensX(e.getX());
                int idx = indexAt(e.getX());
                if (idx != hoverIndex) {
                    hoverIndex = idx;
                    performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK);
                }
                kick();
                return true;
            case MotionEvent.ACTION_UP:
                if (!touching) return false;
                finish(true);
                return true;
            case MotionEvent.ACTION_CANCEL:
                if (!touching) return false;
                finish(false);
                return true;
        }
        return super.onTouchEvent(e);
    }

    private void finish(boolean commit) {
        touching = false;
        presence.target = 0f;
        int idx = indexAt(lensX.target);
        hoverIndex = -1;
        if (commit && !items.isEmpty()) {
            Item it = items.get(idx);
            boolean selectable = !it.disabled && it.selectable;
            if (selectable) activeIndex = idx;
            if (selectable) lensX.target = slotCenter(idx);
            else if (activeIndex >= 0) lensX.target = slotCenter(activeIndex);
            if (listener != null) listener.onItemTap(it.id);
        } else if (activeIndex >= 0) {
            lensX.target = slotCenter(activeIndex);
        }
        kick();
    }

    private void kick() {
        lastFrameNanos = 0;
        invalidate();
    }

    // ------------------------------------------------------------ lifecycle

    @Override
    protected void onAttachedToWindow() {
        super.onAttachedToWindow();
        getViewTreeObserver().addOnScrollChangedListener(scrollListener);
        getViewTreeObserver().addOnGlobalLayoutListener(keyboardListener);
        postDelayed(idleRefresh, 500);
        checkKeyboard();
    }

    
    @Override
    protected void onDetachedFromWindow() {
        getViewTreeObserver().removeOnScrollChangedListener(scrollListener);
        getViewTreeObserver().removeOnGlobalLayoutListener(keyboardListener);
        removeCallbacks(idleRefresh);
        super.onDetachedFromWindow();
    }

    // ----------------------------------------------------------------- theme

    private void applyTheme() {
        if (dark) {
            iconColor = 0xA8FFFFFF;
            accentColor = 0xFF48E3CC;
            capsuleColor = 0x26FFFFFF;
            lensBase = 0xD9202225;
            lensTint = 0x14FFFFFF;
            lensHi = 0x40FFFFFF;
            rimA = 0x99FFFFFF; rimB = 0x0AFFFFFF; rimC = 0x55FFFFFF;
        } else {
            iconColor = 0xBF3C3C43;
            accentColor = 0xFF0F9D8A;
            capsuleColor = 0x14000000;
            lensBase = 0xD9FFFFFF;
            lensTint = 0x26FFFFFF;
            lensHi = 0x99FFFFFF;
            rimA = 0xFFFFFFFF; rimB = 0x40FFFFFF; rimC = 0xE6FFFFFF;
        }
    }

    private void rebuildShaders(boolean haveBackdrop) {
        int top, bottom;
        if (haveBackdrop) {
            top = dark ? 0x2EFFFFFF : 0x70FFFFFF;
            bottom = dark ? 0x12FFFFFF : 0x52F5F5F7;
        } else {
            top = dark ? 0xF02A2C30 : 0xF2FFFFFF;
            bottom = dark ? 0xF01C1D20 : 0xEBF2F2F4;
        }
        bodyShader = new LinearGradient(0, pill.top, 0, pill.bottom, top, bottom, Shader.TileMode.CLAMP);
        rimShader = new LinearGradient(pill.left, pill.top, pill.right, pill.bottom,
                new int[]{rimA, rimB, rimB, rimC}, new float[]{0f, 0.3f, 0.7f, 1f}, Shader.TileMode.CLAMP);
        shaderBackdropMode = haveBackdrop;
        shadersDirty = false;
    }

    // ------------------------------------------------------------------ draw

    @Override
    protected void onDraw(Canvas c) {
        computePill();
        if (items.isEmpty() || pill.width() <= 0) return;

        long now = System.nanoTime();
        float dt = lastFrameNanos == 0 ? 1f / 60f : Math.min((now - lastFrameNanos) / 1e9f, 0.05f);
        lastFrameNanos = now;

        if (!touching && activeIndex >= 0) {
            float target = slotCenter(activeIndex);
            if (!selInit) { selX.value = target; selX.velocity = 0f; selInit = true; }
            selX.target = target;
        }
        lensX.step(dt, 0.12f, 1f);
        presence.step(dt, 0.32f, 0.72f);
        selX.step(dt, 0.30f, 0.85f);
        boolean moving = !lensX.settle(0.05f);
        moving |= !presence.settle(0.002f);
        moving |= !selX.settle(0.05f);
        float pres = Math.max(0f, presence.value);

        // ---- capture the WebView once per frame
        boolean haveBackdrop = false;
        if (ENABLE_BACKDROP && !menuOpen && SystemClock.uptimeMillis() >= captureHoldUntil
                && !backdropBroken && backdropSource != null
                && Build.VERSION.SDK_INT >= 31 && c.isHardwareAccelerated()
                && backdropSource.getWidth() > 0) {
            try {
                recordSource();
                haveBackdrop = true;
            } catch (Throwable t) {
                backdropBroken = true;
            }
        }
        if (haveBackdrop != shaderBackdropMode) shadersDirty = true;
        if (shadersDirty) rebuildShaders(haveBackdrop);

        float pr = pill.height() / 2f;
        tmpPath.reset();
        tmpPath.addRoundRect(pill, pr, pr, Path.Direction.CW);

        // ---- soft shadow outside the pill
        if (Build.VERSION.SDK_INT >= 26) {
            c.save();
            c.clipOutPath(tmpPath);
            p.reset();
            p.setAntiAlias(true);
            p.setColor(Color.BLACK);
            p.setShadowLayer(16 * dp, 0, 6 * dp, dark ? 0x66000000 : 0x2E000000);
            c.drawRoundRect(pill, pr, pr, p);
            p.clearShadowLayer();
            c.restore();
        }

        // ---- frosted backdrop
        if (haveBackdrop) {
            int saved = c.save();
            try {
                c.clipPath(tmpPath);
                drawBlurredBackdrop(c);
                p.reset();
                p.setColor(dark ? WASH_DARK : WASH_LIGHT);
                c.drawRect(pill, p);
            } catch (Throwable t) {
                backdropBroken = true;
                haveBackdrop = false;
            } finally {
                c.restoreToCount(saved);   // always balanced, even if drawing fails
            }
        }

        // ---- glass body + rim
        p.reset();
        p.setAntiAlias(true);
        p.setShader(bodyShader);
        c.drawRoundRect(pill, pr, pr, p);

        p.reset();
        p.setAntiAlias(true);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(1.2f * dp);
        p.setShader(rimShader);
        c.drawRoundRect(pill.left + 0.6f * dp, pill.top + 0.6f * dp,
                pill.right - 0.6f * dp, pill.bottom - 0.6f * dp, pr, pr, p);
        if (!dark) {
            p.reset();
            p.setAntiAlias(true);
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(0.6f * dp);
            p.setColor(0x14000000);
            c.drawRoundRect(pill, pr, pr, p);
        }

        // ---- selected capsule
        float capAlpha = 1f - Math.min(1f, pres);
        if (activeIndex >= 0 && capAlpha > 0.01f) {
            float cw = slotW() - 2 * dp, ch = 54 * dp, cy = pill.centerY();
            p.reset();
            p.setAntiAlias(true);
            p.setColor(capsuleColor);
            p.setAlpha((int) (Color.alpha(capsuleColor) * capAlpha));
            c.drawRoundRect(selX.value - cw / 2, cy - ch / 2, selX.value + cw / 2, cy + ch / 2,
                    ch / 2, ch / 2, p);
        }

        // ---- normal icons
        drawItems(c, false);

        // ---- lens
        if (pres > 0.01f) {
            float cx = lensX.value, cy = pill.centerY();
            float lw = slotW() + 10 * dp * pres;
            float lh = 54 * dp + 16 * dp * pres;
            float lr = lh / 2f;
            float mag = 1f + 0.22f * pres;
            lens.set(cx - lw / 2, cy - lh / 2, cx + lw / 2, cy + lh / 2);
            tmpPath.reset();
            tmpPath.addRoundRect(lens, lr, lr, Path.Direction.CW);

            if (Build.VERSION.SDK_INT >= 26) {
                int sa = (int) (Math.min(1f, pres) * (dark ? 0x70 : 0x30));
                c.save();
                c.clipOutPath(tmpPath);
                p.reset();
                p.setAntiAlias(true);
                p.setColor(Color.BLACK);
                p.setShadowLayer(14 * dp, 0, 5 * dp, sa << 24);
                c.drawRoundRect(lens, lr, lr, p);
                p.clearShadowLayer();
                c.restore();
            }

            c.save();
            c.clipPath(tmpPath);

            p.reset();
            p.setColor(lensBase);
            c.drawRect(lens, p);

            if (haveBackdrop) {
                try {
                    if (Build.VERSION.SDK_INT >= 33) drawLensRefraction(c, lr, 1f + 0.28f * pres);
                    else drawPlainMagnified(c, cx, cy, mag);
                } catch (Throwable t) {
                    backdropBroken = true;
                }
            }

            p.reset();
            p.setColor(lensTint);
            c.drawRect(lens, p);

            p.reset();
            p.setShader(new LinearGradient(0, lens.top, 0, lens.bottom,
                    lensHi, 0x00FFFFFF, Shader.TileMode.CLAMP));
            c.drawRect(lens, p);

            c.save();
            c.scale(mag, mag, cx, cy);
            drawItems(c, true);
            c.restore();

            c.restore();

            p.reset();
            p.setAntiAlias(true);
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(1.2f * dp);
            p.setColor(dark ? 0x70FFFFFF : 0xFFFFFFFF);
            c.drawRoundRect(lens, lr, lr, p);
            if (!dark) {
                p.setStrokeWidth(0.6f * dp);
                p.setColor(0x1A000000);
                c.drawRoundRect(lens, lr, lr, p);
            }
        }

        if (moving) postInvalidateOnAnimation();
        else lastFrameNanos = 0;
    }

    private void drawItems(Canvas c, boolean magnified) {
        float slot = slotW();
        float cy = pill.centerY();
        float iconSize = 22 * dp;
        for (int i = 0; i < items.size(); i++) {
            Item it = items.get(i);
            float cx = slotCenter(i);
            boolean accent = magnified
                    ? (hoverIndex >= 0 ? i == hoverIndex : i == activeIndex)
                    : i == activeIndex;
            int color = accent ? accentColor : iconColor;
            if (it.disabled) color = (color & 0x00FFFFFF) | ((int) (Color.alpha(color) * 0.4f) << 24);

            p.reset();
            p.setAntiAlias(true);
            p.setColor(color);
            float s = iconSize / Math.max(it.w, it.h);
            tmpMatrix.reset();
            tmpMatrix.setScale(s, s);
            tmpMatrix.postTranslate(cx - it.w * s / 2f, cy - 8 * dp - it.h * s / 2f);
            it.path.transform(tmpMatrix, iconPath);
            c.drawPath(iconPath, p);

            textP.setColor(color);
            textP.setTextSize(10 * dp);
            float tw = textP.measureText(it.label);
            if (tw > slot - 6 * dp) textP.setTextSize(10 * dp * (slot - 6 * dp) / tw);
            c.drawText(it.label, cx, cy + 18 * dp, textP);

            if (it.badge > 0) {
                float bx = cx + 11 * dp, by = cy - 19 * dp;
                p.reset();
                p.setAntiAlias(true);
                p.setColor(0xFFFA5252);
                c.drawCircle(bx, by, 8 * dp, p);
                textP.setColor(Color.WHITE);
                textP.setTextSize(9 * dp);
                c.drawText(it.badge > 99 ? "99+" : String.valueOf(it.badge), bx, by + 3.2f * dp, textP);
            }
        }
    }

    // ------------------------------------------------------ backdrop helpers

    @RequiresApi(29)
    private void recordSource() {
        if (srcNode == null) srcNode = new RenderNode("dockSrc");
        int w = getWidth(), h = getHeight();
        srcNode.setPosition(0, 0, w, h);
        RecordingCanvas rc = srcNode.beginRecording(w, h);
        try {
            int[] me = new int[2], wv = new int[2];
            getLocationInWindow(me);
            backdropSource.getLocationInWindow(wv);
            rc.translate(wv[0] - me[0], wv[1] - me[1]);
            backdropSource.draw(rc);
        } finally {
            srcNode.endRecording();
        }
    }

    @RequiresApi(29)
    private void wrap(RenderNode node) {
        int w = getWidth(), h = getHeight();
        node.setPosition(0, 0, w, h);
        RecordingCanvas rc = node.beginRecording(w, h);
        rc.drawRenderNode(srcNode);
        node.endRecording();
    }

    @RequiresApi(31)
    private void drawBlurredBackdrop(Canvas c) {
        if (blurNode == null) blurNode = new RenderNode("dockBlur");
        wrap(blurNode);
        float sigma = 14 * dp;
        RenderEffect blur = RenderEffect.createBlurEffect(sigma, sigma, Shader.TileMode.CLAMP);
        ColorMatrix cm = new ColorMatrix();
        cm.setSaturation(BACKDROP_SATURATION);
        RenderEffect sat = RenderEffect.createColorFilterEffect(new ColorMatrixColorFilter(cm));
        blurNode.setRenderEffect(RenderEffect.createChainEffect(sat, blur));
        c.drawRenderNode(blurNode);
    }

    @RequiresApi(33)
    private void drawLensRefraction(Canvas c, float lr, float mag) {
        if (lensNode == null) lensNode = new RenderNode("dockLens");
        if (lensShader == null) lensShader = new RuntimeShader(LENS_AGSL);
        lensShader.setFloatUniform("center", lens.centerX(), lens.centerY());
        lensShader.setFloatUniform("halfSize", lens.width() / 2f, lens.height() / 2f);
        lensShader.setFloatUniform("radius", lr);
        lensShader.setFloatUniform("mag", mag);
        wrap(lensNode);
        lensNode.setRenderEffect(RenderEffect.createRuntimeShaderEffect(lensShader, "content"));
        c.drawRenderNode(lensNode);
    }

    @RequiresApi(31)
    private void drawPlainMagnified(Canvas c, float cx, float cy, float mag) {
        if (lensNode == null) lensNode = new RenderNode("dockLens");
        wrap(lensNode);
        lensNode.setRenderEffect(null);
        c.save();
        c.scale(mag, mag, cx, cy);
        c.drawRenderNode(lensNode);
        c.restore();
    }
}