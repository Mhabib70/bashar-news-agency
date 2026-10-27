package ir.basharnews.app;

import android.app.Activity;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;

/**
 * خبرگزاری بشر — WebView wrapper
 * آدرس سرور به‌صورت پیش‌فرض از strings.xml خوانده می‌شود و کاربر می‌تواند
 * در صورت خطای اتصال، آن را از پنجره داخل اپ تغییر دهد (در SharedPreferences ذخیره می‌شود).
 */
public class MainActivity extends Activity {

    private static final String PREFS = "bashar_prefs";
    private static final String KEY_URL = "server_url";

    private WebView web;
    private LinearLayout errorBox;
    private EditText urlInput;
    private boolean errored = false;

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
