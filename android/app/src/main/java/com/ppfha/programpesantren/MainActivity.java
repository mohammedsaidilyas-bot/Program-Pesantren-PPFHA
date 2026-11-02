package com.ppfha.programpesantren;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceError;
import android.widget.Toast;
import android.view.View;
import android.view.WindowManager;
import android.content.Intent;
import android.net.Uri;

public class MainActivity extends Activity {
    private static final String HOME = "https://program-pesantren-ppfha.vercel.app/";
    private static final int CAMERA_REQUEST = 101;
    private WebView webView;
    private PermissionRequest pendingPermission;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(0xff123f31);
        getWindow().setNavigationBarColor(0xff123f31);
        webView = new WebView(this);
        setContentView(webView);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setSupportZoom(false);
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equals(uri.getScheme()) || "http".equals(uri.getScheme())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) {}
                return true;
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) Toast.makeText(MainActivity.this, "Periksa koneksi internet.", Toast.LENGTH_LONG).show();
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    boolean cameraRequested = false;
                    for (String resource : request.getResources()) if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) cameraRequested = true;
                    if (!cameraRequested || !"https".equals(request.getOrigin().getScheme())) { request.deny(); return; }
                    if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                        request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                    } else {
                        pendingPermission = request;
                        requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_REQUEST);
                    }
                });
            }
            @Override public void onPermissionRequestCanceled(PermissionRequest request) {
                if (pendingPermission == request) pendingPermission = null;
            }
        });
        webView.loadUrl(HOME);
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == CAMERA_REQUEST && pendingPermission != null) {
            if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) {
                pendingPermission.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            } else pendingPermission.deny();
            pendingPermission = null;
        }
    }
    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
    @Override protected void onDestroy() {
        if (pendingPermission != null) { pendingPermission.deny(); pendingPermission = null; }
        if (webView != null) { webView.destroy(); webView = null; }
        super.onDestroy();
    }
}
