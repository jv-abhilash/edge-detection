#!/usr/bin/env python3
"""
serve_apk.py — finds the built debug APK and serves it over your local
network so your phone can download and install it directly, without
needing adb or USB/wireless debugging.

Usage:
    python3 serve_apk.py [port]

Then on your phone (same WiFi), visit:
    http://<this-machine's-LAN-IP>:<port>/

and tap the .apk file to download and install it.
"""

import http.server
import os
import socket
import sys

DEFAULT_PORT = 8080
APK_PATH = "android/app/build/outputs/apk/debug/app-debug.apk"


def get_lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PORT

    if not os.path.exists(APK_PATH):
        print(f"ERROR: APK not found at '{APK_PATH}'.")
        print("Build it first in Android Studio (Build -> Build APK(s)),")
        print("or run: npx cap sync android   then build from Android Studio.")
        sys.exit(1)

    apk_dir = os.path.dirname(APK_PATH)
    apk_name = os.path.basename(APK_PATH)
    size_mb = os.path.getsize(APK_PATH) / (1024 * 1024)
    lan_ip = get_lan_ip()

    print(f"Serving: {APK_PATH}  ({size_mb:.1f} MB)")
    print(f"On your phone (same WiFi), open:")
    print(f"    http://{lan_ip}:{port}/{apk_name}")
    print(f"or browse the folder at:")
    print(f"    http://{lan_ip}:{port}/")
    print("Press Ctrl+C to stop.\n")

    os.chdir(apk_dir)
    handler = http.server.SimpleHTTPRequestHandler
    with http.server.ThreadingHTTPServer(("0.0.0.0", port), handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")


if __name__ == "__main__":
    main()
