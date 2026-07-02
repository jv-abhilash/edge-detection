# Part 1 — Foundation: Camera, OpenCV.js, and the First 4 Modes

## Why "Funny Camera"?
Working title picked at the very start — a lightweight camera app that
launches different real-time computer-vision "lenses." The name stuck.

## Architecture decision: on-device, no backend
Three options were considered for where the OpenCV processing would run:
client-server (phone streams frames to a Python backend), on-device native
Python (Chaquopy), or on-device JavaScript via OpenCV.js (WebAssembly).

**Chosen: OpenCV.js in a Capacitor WebView.** This project's goal was to
run standalone on the phone with zero network dependency — Python cannot
execute inside a WebView without a bridge, so JS/WASM was the only path
that satisfied "no backend, no Python, works offline."

## The core pipeline (every mode uses this same shape)
```
Phone camera → getUserMedia() → <video> element
   → drawImage() onto hidden <canvas> each frame (this is the JS pixel buffer)
   → cv.imread(canvas) → crosses from JS memory into WASM memory as a Mat
   → cvtColor / GaussianBlur / [mode-specific processing]
   → cv.imshow(outputCanvas) → rendered back to a visible canvas
   → Mat.delete() → manual WASM memory cleanup (no garbage collector reaches WASM memory)
```
Every processor function receives the same three inputs — `src` (raw RGBA
frame), `gray` (grayscale), `blurred` (Gaussian-blurred grayscale) — computed
once per frame, since almost every classical CV technique needs some subset
of these anyway.

## Why manual `.delete()` everywhere
OpenCV.js is OpenCV's C++ core compiled to WebAssembly. WASM has its own
linear memory space, separate from JavaScript's garbage-collected heap.
Every `cv.Mat` lives in WASM memory — JS's garbage collector has no
visibility into it, so skipping `.delete()` leaks memory until the app
crashes. This is the single biggest gotcha versus writing the same
algorithms in desktop Python (where NumPy arrays are normal
garbage-collected objects).

## Part 1 modes
| Mode | Technique | Why it's named that |
|---|---|---|
| **Edge Detection** | Canny algorithm (Sobel gradients → non-max suppression → double threshold → hysteresis) | Named after John F. Canny, who published the algorithm in 1986 |
| **Edges on Gray** | Same Canny pipeline, composited onto the live grayscale feed instead of a black background | Descriptive — shows edges *in context* rather than isolated |
| **Cartoon** | Bilateral filter (edge-preserving color smoothing) + adaptive-threshold outline mask | Flat color regions + bold outlines mimics a cartoon/illustration look |
| **Contours** | `findContours` traces closed/open boundaries from the Canny edge map | A "contour" is the actual traceable shape outline — a step beyond raw edge pixels |

## Orientation handling (the hard-won part)
Three iterations happened here, worth remembering:
1. **First attempt:** rotate the live video using `screen.orientation.angle`.
   Broken — this API reflects the *screen's* rotation, which freezes if the
   phone's OS-level auto-rotate is off (common default), regardless of how
   the phone is physically held.
2. **Second attempt:** rotate live video using real accelerometer data
   (`DeviceOrientationEvent`, beta/gamma). Technically more correct, but
   rotating the *live preview* continuously caused visible flipping/confusion
   whenever the angle was even slightly miscalibrated.
3. **Final design (EXIF-style):** the live preview is **never** rotated —
   exactly like a real camera app never rotates its live sensor feed. The
   UI buttons rotate live via CSS `transform`, driven by the accelerometer,
   purely as a "which way is up" indicator. Rotation is baked into the
   **captured photo's pixels only, once, at the moment of saving** — the
   same pattern a real camera uses when it writes an EXIF orientation tag.

## Front camera mirroring
The live *display* is mirrored via CSS `scaleX(-1)` for `facingMode: 'user'`
(natural selfie feel). The saved pixel data itself is not mirrored — this
matches how real camera apps vary, and is a known, intentional simplification.

## Capacitor + Android packaging
`React/Vite → Capacitor (wraps built web assets in a native WebView) →
Android Studio/Gradle (compiles the native shell + signs the APK)`.
No native Android code was written beyond a runtime `CAMERA` permission
request in `MainActivity.java` — Android gates camera access behind an
explicit runtime prompt (Android 6+), on top of the `<uses-permission>`
manifest declaration.
