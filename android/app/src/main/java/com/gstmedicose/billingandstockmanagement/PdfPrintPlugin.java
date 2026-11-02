package com.gstmedicose.billingandstockmanagement;

import android.content.Context;
import android.graphics.pdf.PdfRenderer;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintDocumentInfo;
import android.print.PrintManager;
import android.util.Base64;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;

@CapacitorPlugin(name = "PdfPrint")
public class PdfPrintPlugin extends Plugin {

    @PluginMethod
    public void print(PluginCall call) {
        String base64 = call.getString("base64");
        final String jobName = call.getString("jobName", "Invoice");
        if (base64 == null || base64.isEmpty()) {
            call.reject("base64 missing");
            return;
        }

        final byte[] data;
        try {
            data = Base64.decode(base64, Base64.DEFAULT);
        } catch (IllegalArgumentException e) {
            call.reject("Invalid PDF data");
            return;
        }

        final boolean landscape = isLandscape(data);

        getActivity().runOnUiThread(() -> {
            try {
                PrintManager pm = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                if (pm == null) {
                    call.reject("Printing is not available on this device");
                    return;
                }
                PrintAttributes.MediaSize size = landscape
                        ? PrintAttributes.MediaSize.ISO_A4.asLandscape()
                        : PrintAttributes.MediaSize.ISO_A4.asPortrait();
                PrintAttributes attrs = new PrintAttributes.Builder().setMediaSize(size).build();
                pm.print(jobName, new BytesPrintAdapter(data, jobName), attrs);
                call.resolve();
            } catch (Exception e) {
                call.reject("Print failed: " + e.getMessage());
            }
        });
    }

    /** Reads the first page size so a landscape invoice template prints in landscape. */
    private boolean isLandscape(byte[] data) {
        File tmp = null;
        ParcelFileDescriptor pfd = null;
        PdfRenderer renderer = null;
        PdfRenderer.Page page = null;
        try {
            tmp = File.createTempFile("print", ".pdf", getContext().getCacheDir());
            try (FileOutputStream out = new FileOutputStream(tmp)) {
                out.write(data);
            }
            pfd = ParcelFileDescriptor.open(tmp, ParcelFileDescriptor.MODE_READ_ONLY);
            renderer = new PdfRenderer(pfd);
            if (renderer.getPageCount() == 0) return false;
            page = renderer.openPage(0);
            return page.getWidth() > page.getHeight();
        } catch (Exception e) {
            return false;   // fall back to portrait
        } finally {
            if (page != null) page.close();
            if (renderer != null) renderer.close();
            if (pfd != null) {
                try { pfd.close(); } catch (IOException ignored) { }
            }
            if (tmp != null) tmp.delete();
        }
    }

    /** Streams an in-memory PDF to the Android print framework. */
    private static class BytesPrintAdapter extends PrintDocumentAdapter {
        private final byte[] data;
        private final String name;

        BytesPrintAdapter(byte[] data, String name) {
            this.data = data;
            this.name = name.toLowerCase().endsWith(".pdf") ? name : name + ".pdf";
        }

        @Override
        public void onLayout(PrintAttributes oldAttributes, PrintAttributes newAttributes,
                             CancellationSignal cancellationSignal, LayoutResultCallback callback,
                             Bundle extras) {
            if (cancellationSignal.isCanceled()) {
                callback.onLayoutCancelled();
                return;
            }
            PrintDocumentInfo info = new PrintDocumentInfo.Builder(name)
                    .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
                    .build();
            callback.onLayoutFinished(info, true);
        }

        @Override
        public void onWrite(PageRange[] pages, ParcelFileDescriptor destination,
                            CancellationSignal cancellationSignal, WriteResultCallback callback) {
            try (OutputStream out = new FileOutputStream(destination.getFileDescriptor())) {
                out.write(data);
                out.flush();
                callback.onWriteFinished(new PageRange[]{PageRange.ALL_PAGES});
            } catch (IOException e) {
                callback.onWriteFailed(e.getMessage());
            }
        }
    }
}