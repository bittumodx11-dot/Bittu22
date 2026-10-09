#!/bin/bash
set -e

echo "=== Building SnapDoc Tools High-Performance Android APK ==="

PROJECT_ROOT="$(pwd)"
WORK_DIR="/tmp/android-build"
rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR/src/com/snapdoc/tools"
mkdir -p "$WORK_DIR/res/values"
mkdir -p "$WORK_DIR/res/mipmap-mdpi"
mkdir -p "$WORK_DIR/res/mipmap-hdpi"
mkdir -p "$WORK_DIR/res/mipmap-xhdpi"
mkdir -p "$WORK_DIR/res/mipmap-xxhdpi"
mkdir -p "$WORK_DIR/res/mipmap-xxxhdpi"
mkdir -p "$WORK_DIR/assets"
mkdir -p "$WORK_DIR/bin"
mkdir -p "$WORK_DIR/obj"

# 1. First ensure clean web production build
echo "[1/7] Ensuring fresh web production build..."
npm run build

# 2. Copy web assets to Android assets (EXCLUDING downloads directory to prevent bloat)
echo "[2/7] Copying web app dist to APK assets..."
rsync -av --exclude='downloads' ./dist/ "$WORK_DIR/assets/" 2>/dev/null || (
  cp -r ./dist/* "$WORK_DIR/assets/"
  rm -rf "$WORK_DIR/assets/downloads"
)

# 3. Copy launcher icons from public
if [ -f "./public/pwa-192x192.png" ]; then
  cp "./public/pwa-192x192.png" "$WORK_DIR/res/mipmap-mdpi/ic_launcher.png"
  cp "./public/pwa-192x192.png" "$WORK_DIR/res/mipmap-hdpi/ic_launcher.png"
  cp "./public/pwa-192x192.png" "$WORK_DIR/res/mipmap-xhdpi/ic_launcher.png"
  cp "./public/pwa-512x512.png" "$WORK_DIR/res/mipmap-xxhdpi/ic_launcher.png"
  cp "./public/pwa-512x512.png" "$WORK_DIR/res/mipmap-xxxhdpi/ic_launcher.png"
fi

# 4. Create AndroidManifest.xml and strings.xml
echo "[3/7] Generating Android Manifest and resources..."
cat << 'EOF' > "$WORK_DIR/res/values/strings.xml"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">SnapDoc Tools</string>
</resources>
EOF

cat << 'EOF' > "$WORK_DIR/AndroidManifest.xml"
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.snapdoc.tools"
    android:versionCode="1"
    android:versionName="1.0.0">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="33" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

    <application
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:theme="@android:style/Theme.NoTitleBar"
        android:allowBackup="true"
        android:hardwareAccelerated="true"
        android:usesCleartextTraffic="true">
        <activity
            android:name=".MainActivity"
            android:label="@string/app_name"
            android:configChanges="orientation|keyboardHidden|screenSize|uiMode"
            android:windowSoftInputMode="adjustResize"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
EOF

# 5. Java source code with ultra-fast native asset interception
echo "[4/7] Generating MainActivity.java with robust WebView asset loader..."
cat << 'EOF' > "$WORK_DIR/src/com/snapdoc/tools/MainActivity.java"
package com.snapdoc.tools;

import android.app.Activity;
import android.content.Intent;
import android.content.res.AssetManager;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.Window;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends Activity {
    private WebView mWebView;
    private ValueCallback<Uri[]> mFilePathCallback;
    private final static int FILECHOOSER_RESULTCODE = 101;
    public final static String APP_ORIGIN = "https://snapdoc.app";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);

        mWebView = new WebView(this);
        mWebView.setBackgroundColor(0xFF0F172A);

        WebSettings settings = mWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMediaPlaybackRequiresUserGesture(false);

        mWebView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith(APP_ORIGIN) || url.startsWith("blob:") || url.startsWith("data:")) {
                    return false;
                }
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                    return true;
                } catch (Exception e) {
                    return false;
                }
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (request != null && request.getUrl() != null) {
                    return handleIntercept(request.getUrl());
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                if (url != null) {
                    return handleIntercept(Uri.parse(url));
                }
                return super.shouldInterceptRequest(view, url);
            }
        });

        mWebView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (mFilePathCallback != null) {
                    mFilePathCallback.onReceiveValue(null);
                    mFilePathCallback = null;
                }
                mFilePathCallback = filePathCallback;

                try {
                    Intent intent = fileChooserParams.createIntent();
                    startActivityForResult(intent, FILECHOOSER_RESULTCODE);
                    return true;
                } catch (Exception e) {
                    try {
                        Intent fallbackIntent = new Intent(Intent.ACTION_GET_CONTENT);
                        fallbackIntent.addCategory(Intent.CATEGORY_OPENABLE);
                        fallbackIntent.setType("*/*");
                        startActivityForResult(Intent.createChooser(fallbackIntent, "Select File"), FILECHOOSER_RESULTCODE);
                        return true;
                    } catch (Exception ex) {
                        if (mFilePathCallback != null) {
                            mFilePathCallback.onReceiveValue(null);
                            mFilePathCallback = null;
                        }
                        return false;
                    }
                }
            }

            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        request.grant(request.getResources());
                    }
                });
            }
        });

        setContentView(mWebView);
        mWebView.loadUrl(APP_ORIGIN + "/index.html");
    }

    private WebResourceResponse handleIntercept(Uri uri) {
        if (uri == null) return null;
        String host = uri.getHost();
        if (host == null || !host.equals("snapdoc.app")) {
            return null;
        }

        String path = uri.getPath();
        if (path == null || path.equals("/") || path.isEmpty()) {
            path = "/index.html";
        }
        String assetPath = path.startsWith("/") ? path.substring(1) : path;

        AssetManager am = getAssets();
        InputStream is = null;
        try {
            is = am.open(assetPath);
        } catch (Exception notFound) {
            // SPA fallback: if requested asset has no extension, route to index.html
            if (!assetPath.contains(".")) {
                try {
                    is = am.open("index.html");
                    assetPath = "index.html";
                } catch (Exception e) {}
            }
        }

        if (is != null) {
            String mime = getMimeType(assetPath);
            Map<String, String> headers = new HashMap<>();
            headers.put("Access-Control-Allow-Origin", "*");
            headers.put("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
            headers.put("Access-Control-Allow-Headers", "*");
            headers.put("Cache-Control", "no-cache");
            return new WebResourceResponse(mime, "UTF-8", 200, "OK", headers, is);
        }

        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", null, new ByteArrayInputStream("Not Found".getBytes()));
    }

    private String getMimeType(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js") || p.endsWith(".mjs")) return "application/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".ico")) return "image/x-icon";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".json") || p.endsWith(".webmanifest")) return "application/json";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".woff")) return "font/woff";
        if (p.endsWith(".ttf")) return "font/ttf";
        return "application/octet-stream";
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILECHOOSER_RESULTCODE) {
            if (mFilePathCallback != null) {
                Uri[] results = null;
                if (resultCode == Activity.RESULT_OK && data != null) {
                    if (data.getClipData() != null) {
                        int count = data.getClipData().getItemCount();
                        results = new Uri[count];
                        for (int i = 0; i < count; i++) {
                            results[i] = data.getClipData().getItemAt(i).getUri();
                        }
                    } else if (data.getData() != null) {
                        results = new Uri[]{data.getData()};
                    }
                }
                mFilePathCallback.onReceiveValue(results);
                mFilePathCallback = null;
            }
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && mWebView != null && mWebView.canGoBack()) {
            mWebView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onDestroy() {
        if (mFilePathCallback != null) {
            mFilePathCallback.onReceiveValue(null);
            mFilePathCallback = null;
        }
        if (mWebView != null) {
            mWebView.destroy();
        }
        super.onDestroy();
    }
}
EOF

# 6. Compile resources with aapt
echo "[5/7] Packaging resources with AAPT..."
aapt package -v -f \
  -M "$WORK_DIR/AndroidManifest.xml" \
  -S "$WORK_DIR/res" \
  -A "$WORK_DIR/assets" \
  -I /tmp/android.jar \
  -F "$WORK_DIR/bin/resources.apk" \
  -J "$WORK_DIR/src"

# 7. Compile Java sources to bytecode
echo "[6/7] Compiling Java sources with javac..."
JAVA_FILES=$(find "$WORK_DIR/src" -name "*.java")
javac -d "$WORK_DIR/obj" \
  -cp "/tmp/android.jar:$WORK_DIR/src" \
  $JAVA_FILES

# 8. Convert bytecode to Dalvik DEX with D8
echo "[7/7] Converting to classes.dex with D8 and signing APK..."
java -cp /tmp/r8.jar com.android.tools.r8.D8 \
  --output "$WORK_DIR/bin" \
  --lib /tmp/android.jar \
  $(find "$WORK_DIR/obj" -name "*.class")

# 9. Add classes.dex into APK
cd "$WORK_DIR/bin"
aapt add -v resources.apk classes.dex

# 10. Align APK with zipalign
zipalign -v -p 4 resources.apk unaligned.apk

# 11. Generate keystore if not exists and sign APK
KEYSTORE="/tmp/snapdoc-release.keystore"
if [ ! -f "$KEYSTORE" ]; then
  keytool -genkeypair -v \
    -keystore "$KEYSTORE" \
    -alias snapdoc \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass snapdoc123 -keypass snapdoc123 \
    -dname "CN=SnapDoc, OU=Tools, O=SnapDoc Studio, L=Kolkata, ST=WB, C=IN"
fi

mkdir -p "$PROJECT_ROOT/downloads" "$PROJECT_ROOT/public/downloads"

apksigner sign \
  --ks "$KEYSTORE" \
  --ks-pass pass:snapdoc123 \
  --key-pass pass:snapdoc123 \
  --out "$PROJECT_ROOT/downloads/SnapDoc-Tools-Android.apk" \
  unaligned.apk

# Copy directly to public downloads for immediate download via web UI
cp -v "$PROJECT_ROOT/downloads/SnapDoc-Tools-Android.apk" "$PROJECT_ROOT/public/downloads/SnapDoc-Tools-Android.apk"

cd "$PROJECT_ROOT"
echo "=== ANDROID APK BUILD SUCCESSFUL ==="
ls -lh "$PROJECT_ROOT/downloads/SnapDoc-Tools-Android.apk" "$PROJECT_ROOT/public/downloads/SnapDoc-Tools-Android.apk"
apksigner verify --verbose "$PROJECT_ROOT/downloads/SnapDoc-Tools-Android.apk"
