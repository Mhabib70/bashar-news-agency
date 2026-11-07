package ir.basharnews.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.provider.Settings;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.DownloadListener;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * خبرگزاری بسیج رشت — WebView wrapper
 * آدرس سرور از strings.xml خوانده می‌شود؛ هنگام خطای اتصال فقط «تلاش مجدد» پیشنهاد می‌شود.
 * پشتیبانی آپلود فایل (عکس/ویدیوی خبر) از طریق onShowFileChooser فراهم است.
 *
 * به‌روزرسانی درون‌اپی: هنگام اجرا، نسخه با سرور چک می‌شود؛ اگر نسخه جدید باشد
 * دیالوگ «به‌روزرسانی و نصب» ظاهر می‌شود (اجباری = غیرقابل بستن) و دانلود +
 * نصب بدون خروج از اپ انجام می‌شود. دیگر نیازی به ارسال لینک نیست.
 */
public class MainActivity extends Activity {

    private static final int FILE_CHOOSER_REQUEST = 1001;

    private WebView web;
    private LinearLayout errorBox;
    private boolean errored = false;
    private ValueCallback<Uri[]> filePathCallback;

    private String serverUrl;
    private DownloadManager dm;

    // وضعیت به‌روزرسانی
    private String pendingVersionName = "";
    private String pendingApkUrl = "";
    private boolean pendingInstall = false;      // برگشته از تنظیماتِ اجازه نصب؛ آماده دانلود
    private boolean updateDialogShowing = false;
    private long downloadId = -1;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
        serverUrl = getString(R.string.default_server_url);
        if (!serverUrl.endsWith("/")) serverUrl += "/";

        web = findViewById(R.id.webview);
        errorBox = findViewById(R.id.error_box);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setAllowFileAccess(true);
        // همیشه نسخه تازه از سرور — جلوگیری از کش‌شدن نسخه کهنه اپ در WebView
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);

        // مارکر نسخه در User-Agent — تا صفحه وب بتواند بنر به‌روزرسانی را برای نسخه‌های قدیمی‌تر نشان دهد
        try {
            android.content.pm.PackageInfo pi = getPackageManager().getPackageInfo(getPackageName(), 0);
            s.setUserAgentString(s.getUserAgentString() + " BasijNews/" + pi.versionName + " (" + pi.versionCode + ")");
        } catch (Exception ignored) { }

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

        // فایل‌پیکر اندروید برای آپلود عکس/ویدیوی خبر
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = callback;
                try {
                    Intent intent = params.createIntent();
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                } catch (Exception e) {
                    filePathCallback = null;
                    return false;
                }
                return true;
            }
        });

        // دانلود هر فایلی (مثل APK از بنر وب) با DownloadManager سیستم + نصب خودکار
        web.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String agent, String disposition, String mimetype, long size) {
                long id = enqueueDownload(url, "خبرگزاری بسیج رشت", true);
                if (id > 0) {
                    toast("دانلود آغاز شد…");
                    pollDownload(id);
                }
            }
        });

        web.loadUrl(serverUrl);

        // دکمه «تلاش مجدد» — فقط داخل پنل خطای اتصال؛ همیشه آدرس پیش‌فرض را بازمی‌گرداند
        Button retryBtn = findViewById(R.id.retry_btn);
        retryBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                errored = false;
                errorBox.setVisibility(View.GONE);
                web.loadUrl(serverUrl);
            }
        });

        // چک نسخه جدید هنگام اجرا
        checkForUpdate();
    }

    // ---------- به‌روزرسانی درون‌اپی ----------

    private int getSelfVersionCode() {
        try {
            android.content.pm.PackageInfo pi = getPackageManager().getPackageInfo(getPackageName(), 0);
            return pi.versionCode;
        } catch (Exception e) {
            return 1;
        }
    }

    private void checkForUpdate() {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    int current = getSelfVersionCode();
                    URL u = new URL(serverUrl + "api/app-version?current=" + current);
                    HttpURLConnection c = (HttpURLConnection) u.openConnection();
                    c.setConnectTimeout(6000);
                    c.setReadTimeout(6000);
                    c.setRequestProperty("Cache-Control", "no-cache");
                    BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), "UTF-8"));
                    StringBuilder b = new StringBuilder();
                    String line;
                    while ((line = r.readLine()) != null) b.append(line);
                    r.close();

                    JSONObject o = new JSONObject(b.toString());
                    int latest = o.optInt("versionCode", 0);
                    if (latest > current) {
                        pendingVersionName = o.optString("versionName", String.valueOf(latest));
                        pendingApkUrl = o.optString("apkUrl", "");
                        final boolean mandatory = o.optBoolean("mandatory", true);
                        final String notes = o.optString("notes", "");
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                showUpdateDialog(pendingVersionName, notes, mandatory);
                            }
                        });
                    }
                } catch (Exception ignored) {
                    // سرور در دسترس نیست — اپ به‌صورت عادی ادامه می‌یابد
                }
            }
        }).start();
    }

    private void showUpdateDialog(String versionName, String notes, boolean mandatory) {
        if (updateDialogShowing || isFinishing()) return;
        updateDialogShowing = true;
        String msg = "نسخه جدید " + versionName + " منتشر شد."
                + (notes.isEmpty() ? "" : "\n\n" + notes)
                + "\n\nبرای ادامه، اپ را به‌روزرسانی کنید.";
        AlertDialog.Builder b = new AlertDialog.Builder(this);
        b.setTitle("🎉 به‌روزرسانی خبرگزاری بسیج");
        b.setMessage(msg);
        b.setCancelable(!mandatory);
        b.setPositiveButton("به‌روزرسانی و نصب", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface d, int which) {
                updateDialogShowing = false;
                maybeInstall();
            }
        });
        if (!mandatory) {
            b.setNegativeButton("بعداً", new DialogInterface.OnClickListener() {
                @Override
                public void onClick(DialogInterface d, int which) {
                    updateDialogShowing = false;
                }
            });
        }
        b.show();
    }

    private void maybeInstall() {
        if (pendingApkUrl == null || pendingApkUrl.isEmpty()) {
            toast("آدرس دانلود در دسترس نیست");
            return;
        }
        if (Build.VERSION.SDK_INT >= 26) {
            try {
                if (!getPackageManager().canRequestPackageInstalls()) {
                    pendingInstall = true;
                    toast("برای نصب، اجازه «نصب برنامه‌های ناشناس» را برای این اپ فعال کنید");
                    try {
                        startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                                Uri.parse("package:" + getPackageName())));
                    } catch (Exception e) {
                        startActivity(new Intent(Settings.ACTION_SECURITY_SETTINGS));
                    }
                    return;
                }
            } catch (Exception ignored) { }
        }
        startApkDownload();
    }

    private void startApkDownload() {
        toast("دانلود نسخه " + pendingVersionName + " آغاز شد…");
        long id = enqueueDownload(pendingApkUrl,
                "خبرگزاری بسیج رشت " + pendingVersionName, false);
        if (id > 0) {
            downloadId = id;
            pollDownload(id);
        }
    }

    private long enqueueDownload(String url, String title, boolean silent) {
        try {
            DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
            req.setTitle(title);
            req.setDescription("در حال دریافت نسخه جدید اپ…");
            req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            req.setMimeType("application/vnd.android.package-archive");
            // نام فایل از آخرین بخش آدرس؛ اگر نبود نام پیش‌فرض
            String fname = "BasijNews-update.apk";
            try {
                String p = Uri.parse(url).getLastPathSegment();
                if (p != null && p.endsWith(".apk")) fname = p;
            } catch (Exception ignored) { }
            req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fname);
            return dm.enqueue(req);
        } catch (Exception e) {
            if (!silent) toast("شروع دانلود ممکن نشد — لینک را در مرورگر باز کنید");
            return -1;
        }
    }

    /** تا پایان دانلود وضعیت را چک می‌کند و سپس صفحه نصب را باز می‌کند. */
    private void pollDownload(final long id) {
        final Handler h = new Handler();
        final Runnable[] task = new Runnable[1];
        task[0] = new Runnable() {
            @Override
            public void run() {
                try {
                    DownloadManager.Query q = new DownloadManager.Query();
                    q.setFilterById(id);
                    Cursor c = dm.query(q);
                    int status = -1;
                    if (c != null && c.moveToFirst()) {
                        status = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
                        c.close();
                    }
                    if (status == DownloadManager.STATUS_SUCCESSFUL) {
                        openInstaller(id);
                        return;
                    }
                    if (status == DownloadManager.STATUS_FAILED) {
                        toast("دانلود ناموفق بود — دوباره تلاش کنید");
                        return;
                    }
                } catch (Exception ignored) { }
                h.postDelayed(task[0], 1200);
            }
        };
        h.postDelayed(task[0], 1200);
    }

    private void openInstaller(long id) {
        try {
            Uri uri = dm.getUriForDownloadedFile(id);
            if (uri == null) {
                toast("فایل دانلودشده یافت نشد");
                return;
            }
            Intent i = new Intent(Intent.ACTION_INSTALL_PACKAGE);
            i.setData(uri);
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(i);
        } catch (Exception e) {
            toast("اجرای نصب ممکن نشد — فایل در پوشه Download است");
        }
    }

    private void toast(String msg) {
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show();
    }

    @Override
    protected void onResume() {
        super.onResume();
        // برگشت از صفحه اجازه «نصب برنامه‌های ناشناس» — اگر اجازه داده شد، دانلود ادامه یابد
        if (pendingInstall) {
            boolean ok = true;
            if (Build.VERSION.SDK_INT >= 26) ok = getPackageManager().canRequestPackageInstalls();
            if (ok) {
                pendingInstall = false;
                startApkDownload();
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST && filePathCallback != null) {
            Uri[] results = null;
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                results = new Uri[]{ data.getData() };
            }
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
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
