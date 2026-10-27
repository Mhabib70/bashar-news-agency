package ir.basharnews.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.Toast;

/**
 * خبرگزاری بشر — WebView wrapper (v1.1)
 * آدرس سرور به‌صورت پیش‌فرض از strings.xml خوانده می‌شود و کاربر می‌تواند
 * در صورت خطای اتصال، آن را از پنجره داخل اپ تغییر دهد (در SharedPreferences ذخیره می‌شود).
 * v1.1: پشتیبانی آپلود عکس/ویدیو (onShowFileChooser) + دانلود CSV (DownloadListener)
 */
public class MainActivity extends Activity {

    private static final String PREFS = "bashar_prefs";
    private static final String KEY_URL = "server_url";
    private static final int FILE_CHOOSER_CODE = 1001;

    private WebView web;
    private LinearLayout errorBox;
    private EditText urlInput;
    private boolean errored = false;
    private ValueCallback<Uri[]> filePathCallback;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        web = findViewById(R.id.webview);
        errorBox = findViewById(R.id.error_box);
        urlInput = findViewById(R.id.url_input);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setMediaPlaybackRequiresUserGesture(true);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showError();
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, android.webkit.WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 400) showError();
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if (!errored) errorBox.setVisibility(View.GONE);
            }
        });

        // v1.1: انتخاب فایل برای آپلود رسانه خبر (عکس/ویدیو)
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = callback;
                try {
                    Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("*/*");
                    String[] types = params.getAcceptTypes();
                    if (types != null && types.length > 0 && types[0] != null && !types[0].isEmpty()) {
                        intent.setType(types[0]);
                    }
                    startActivityForResult(Intent.createChooser(intent, "انتخاب رسانه"), FILE_CHOOSER_CODE);
                    return true;
                } catch (Exception e) {
                    filePathCallback = null;
                    return false;
                }
            }
        });

        // v1.1: دانلود خروجی‌های CSV با DownloadManager سیستم
        web.setDownloadListener(new android.webkit.DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimeType, long contentLength) {
                try {
                    DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
                    String name = URLUtilGuess(url, contentDisposition);
                    req.setTitle(name);
                    req.setDescription("خبرگزاری بشر");
                    req.setMimeType(mimeType == null ? "text/csv" : mimeType);
                    req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
                    DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                    if (dm != null) {
                        dm.enqueue(req);
                        Toast.makeText(MainActivity.this, "دانلود آغاز شد: " + name, Toast.LENGTH_SHORT).show();
                    }
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "دانلود ممکن نشد", Toast.LENGTH_SHORT).show();
                }
            }
        });

        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        String url = prefs.getString(KEY_URL, getString(R.string.default_server_url));
        urlInput.setText(url);
        web.loadUrl(url);

        Button connectBtn = findViewById(R.id.connect_btn);
        connectBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String u = urlInput.getText().toString().trim();
                if (u.isEmpty()) return;
                if (!u.startsWith("http://") && !u.startsWith("https://")) u = "https://" + u;
                prefs.edit().putString(KEY_URL, u).apply();
                errored = false;
                errorBox.setVisibility(View.GONE);
                web.loadUrl(u);
            }
        });
    }

    /** استخراج نام فایل از Content-Disposition یا URL */
    private String URLUtilGuess(String url, String contentDisposition) {
        if (contentDisposition != null) {
            int i = contentDisposition.indexOf("filename=");
            if (i >= 0) {
                String name = contentDisposition.substring(i + 9).replace("\"", "").split(";")[0].trim();
                if (!name.isEmpty()) return name;
            }
        }
        String clean = url.split("\\?")[0];
        int slash = clean.lastIndexOf('/');
        String name = slash >= 0 ? clean.substring(slash + 1) : clean;
        if (!name.contains(".")) name = name + ".csv";
        return name.isEmpty() ? "bashar-export.csv" : name;
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_CODE) {
            Uri[] result = null;
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                result = new Uri[]{data.getData()};
            }
            if (filePathCallback != null) {
                filePathCallback.onReceiveValue(result);
                filePathCallback = null;
            }
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    private void showError() {
        errored = true;
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                errorBox.setVisibility(View.VISIBLE);
            }
        });
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && web != null && web.canGoBack()) {
            web.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onDestroy() {
        if (web != null) web.destroy();
        super.onDestroy();
    }
}
