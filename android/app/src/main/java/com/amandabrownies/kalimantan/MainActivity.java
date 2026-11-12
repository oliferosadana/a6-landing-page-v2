package com.amandabrownies.kalimantan;

import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.GeolocationPermissions;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private SwipeRefreshLayout swipeRefresh;
    private ProgressBar progressBar;
    private LinearLayout offlineLayout;
    private Button btnRetry;

    private ValueCallback<Uri[]> filePathCallback;
    private ActivityResultLauncher<Intent> fileChooserLauncher;

    private long backPressedTime = 0;
    private static final String TARGET_URL = "https://amandabrownies-kalimantan.store/";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Switch from cold start splash theme to main app theme
        setTheme(R.style.Theme_AmandaBrownies);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        initViews();
        setupFileChooser();
        setupWebView();
        setupSwipeRefresh();
        setupBackNavigation();

        loadLiveSite();
    }

    private void initViews() {
        webView = findViewById(R.id.webview);
        swipeRefresh = findViewById(R.id.swipe_refresh);
        progressBar = findViewById(R.id.page_progress_bar);
        offlineLayout = findViewById(R.id.offline_layout);
        btnRetry = findViewById(R.id.btn_retry);

        btnRetry.setOnClickListener(v -> loadLiveSite());
    }

    private void setupSwipeRefresh() {
        swipeRefresh.setColorSchemeResources(
                R.color.primary_olive,
                R.color.primary_gold
        );
        swipeRefresh.setOnRefreshListener(() -> {
            if (isNetworkAvailable()) {
                webView.reload();
            } else {
                swipeRefresh.setRefreshing(false);
                showOfflineView(true);
            }
        });
    }

    private void setupFileChooser() {
        fileChooserLauncher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> {
                    if (filePathCallback == null) return;
                    Uri[] results = null;
                    if (result.getResultCode() == RESULT_OK && result.getData() != null) {
                        if (result.getData().getData() != null) {
                            results = new Uri[]{result.getData().getData()};
                        } else if (result.getData().getClipData() != null) {
                            int count = result.getData().getClipData().getItemCount();
                            results = new Uri[count];
                            for (int i = 0; i < count; i++) {
                                results[i] = result.getData().getClipData().getItemAt(i).getUri();
                            }
                        }
                    }
                    filePathCallback.onReceiveValue(results);
                    filePathCallback = null;
                }
        );
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        // Mixed content support for secure streaming assets
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        // Offline & fast caching
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Custom User Agent identifier
        String defaultUa = settings.getUserAgentString();
        settings.setUserAgentString(defaultUa + " AmandaBrowniesApp/1.0.0 (Android LiveSync)");

        webView.setWebViewClient(new CustomWebViewClient());
        webView.setWebChromeClient(new CustomWebChromeClient());
    }

    private void loadLiveSite() {
        if (!isNetworkAvailable()) {
            showOfflineView(true);
            return;
        }
        showOfflineView(false);
        webView.loadUrl(TARGET_URL);
    }

    private void showOfflineView(boolean show) {
        if (show) {
            offlineLayout.setVisibility(View.VISIBLE);
            swipeRefresh.setVisibility(View.GONE);
        } else {
            offlineLayout.setVisibility(View.GONE);
            swipeRefresh.setVisibility(View.VISIBLE);
        }
    }

    private boolean isNetworkAvailable() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        NetworkCapabilities nc = cm.getNetworkCapabilities(cm.getActiveNetwork());
        return nc != null && (
                nc.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
                nc.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ||
                nc.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
        );
    }

    private void setupBackNavigation() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    if (System.currentTimeMillis() - backPressedTime < 2000) {
                        finish();
                    } else {
                        backPressedTime = System.currentTimeMillis();
                        Toast.makeText(MainActivity.this, getString(R.string.exit_prompt), Toast.LENGTH_SHORT).show();
                    }
                }
            }
        });
    }

    /**
     * Custom WebViewClient for internal navigation & native app intent delegation
     */
    private class CustomWebViewClient extends WebViewClient {

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            return handleUrlScheme(uri.toString());
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            return handleUrlScheme(url);
        }

        private boolean handleUrlScheme(String url) {
            if (url == null) return false;

            // WhatsApp link handler -> Launch Native WhatsApp App
            if (url.startsWith("whatsapp:") || url.contains("wa.me") || url.contains("api.whatsapp.com")) {
                openExternalApp(url);
                return true;
            }

            // Phone call handler
            if (url.startsWith("tel:")) {
                Intent intent = new Intent(Intent.ACTION_DIAL, Uri.parse(url));
                startActivity(intent);
                return true;
            }

            // Email handler
            if (url.startsWith("mailto:")) {
                Intent intent = new Intent(Intent.ACTION_SENDTO, Uri.parse(url));
                startActivity(intent);
                return true;
            }

            // Google Maps / Geo location
            if (url.startsWith("geo:") || url.contains("maps.google.com") || url.contains("goo.gl/maps")) {
                openExternalApp(url);
                return true;
            }

            // Grab / Gojek / Shopee / Play Store external links
            if (url.startsWith("grab:") || url.startsWith("gojek:") || url.startsWith("intent:") ||
                url.contains("food.grab.com") || url.contains("gofood.link") || url.contains("shopee.co.id")) {
                openExternalApp(url);
                return true;
            }

            // Internal domain navigation -> Keep inside WebView
            if (url.contains("amandabrownies-kalimantan.store") || url.contains("localhost")) {
                return false;
            }

            // Other external websites
            openExternalApp(url);
            return true;
        }

        private void openExternalApp(String url) {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                startActivity(intent);
            } catch (ActivityNotFoundException e) {
                // If native app is not installed, open via web browser fallback
                if (url.startsWith("whatsapp:")) {
                    Toast.makeText(MainActivity.this, "Aplikasi WhatsApp tidak ditemukan", Toast.LENGTH_SHORT).show();
                } else {
                    try {
                        Intent webIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        startActivity(webIntent);
                    } catch (Exception ex) {
                        Toast.makeText(MainActivity.this, "Gagal membuka tautan", Toast.LENGTH_SHORT).show();
                    }
                }
            }
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            progressBar.setVisibility(View.VISIBLE);
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            progressBar.setVisibility(View.GONE);
            swipeRefresh.setRefreshing(false);
            showOfflineView(false);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) {
                progressBar.setVisibility(View.GONE);
                swipeRefresh.setRefreshing(false);
                if (!isNetworkAvailable()) {
                    showOfflineView(true);
                }
            }
        }
    }

    /**
     * Custom WebChromeClient for Progress, File Chooser, and Geolocation
     */
    private class CustomWebChromeClient extends WebChromeClient {

        @Override
        public void onProgressChanged(WebView view, int newProgress) {
            if (newProgress < 100) {
                progressBar.setVisibility(View.VISIBLE);
                progressBar.setProgress(newProgress);
            } else {
                progressBar.setVisibility(View.GONE);
            }
        }

        // File upload picker for receipt photo upload in Customer Service modal
        @Override
        public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
            if (MainActivity.this.filePathCallback != null) {
                MainActivity.this.filePathCallback.onReceiveValue(null);
            }
            MainActivity.this.filePathCallback = filePathCallback;

            Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("image/*");

            Intent chooserIntent = Intent.createChooser(intent, "Pilih Foto Struk / Bukti Pembelian");
            try {
                fileChooserLauncher.launch(chooserIntent);
            } catch (ActivityNotFoundException e) {
                MainActivity.this.filePathCallback = null;
                Toast.makeText(MainActivity.this, "Tidak dapat membuka galeri file", Toast.LENGTH_SHORT).show();
                return false;
            }
            return true;
        }

        @Override
        public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
            callback.invoke(origin, true, false);
        }
    }
}
