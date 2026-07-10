# Funny Camera

A real-time computer vision camera app — built to deeply understand image
processing, OpenCV, and (eventually) machine learning, by implementing
everything from first principles and running it live on an actual phone.

Repo: `github.com/jv-abhilash/edge-detection`

---

## What this is

An Android app (via Capacitor) that runs a live camera feed through a
growing collection of real-time image processing "lens modes" — entirely
on-device, no backend, no network dependency, using OpenCV.js (OpenCV's
C++ core compiled to WebAssembly).

## Architecture

```
React (UI) + Vite (build tool)
        ↓
Capacitor (wraps the built web app in a native Android WebView)
        ↓
Android Studio / Gradle (compiles the native shell, produces the .apk)
```

**Why on-device instead of a Python server:** the original goal was a
standalone app that works with zero network dependency. Python cannot run
inside a Capacitor WebView without a bridge (Chaquopy), so OpenCV.js
(WebAssembly) was chosen — genuine OpenCV, running as compiled C++ inside
the browser engine, callable from JavaScript.

**Exception — the planned "Heavy / Backend" tier** (face recognition)
deliberately breaks this pattern: it streams frames to a Python/FastAPI
backend for GPU-accelerated processing, since real-time face embedding
comparison benefits from more compute than a phone's CPU-bound WASM
runtime can offer.

## The core per-frame pipeline

Every mode shares this same pipeline, only the processing step differs:

```
Phone camera → getUserMedia() → <video> element
   → drawImage() onto a hidden <canvas> each frame (the JS-side pixel buffer)
   → cv.imread(canvas) → crosses from JS memory into WASM memory as a Mat
   → cvtColor (grayscale) + GaussianBlur — computed once, shared by every mode
   → [mode-specific processing] → returns a result Mat
   → cv.imshow(outputCanvas, result) → rendered back to the visible canvas
   → Mat.delete() on every intermediate Mat — manual WASM memory cleanup
     (JavaScript's garbage collector can't reach WASM memory)
```

This loop runs inside a `requestAnimationFrame` cycle, wrapped in a
try/catch — an uncaught error in one mode's processing silently kills the
*entire* render loop otherwise (looks exactly like a frozen screen, no
visible error), so one broken mode degrading gracefully was an important
fix along the way.

**Orientation handling** follows the same convention a real camera app
uses: the live preview is *never* rotated. UI buttons rotate live (driven
by the phone's accelerometer via `DeviceOrientationEvent`) purely as a
"which way is up" indicator. Rotation is baked into a captured photo's
pixels only once, at the moment of saving — the same idea as a camera
writing an EXIF orientation tag.

## App navigation structure

```
Home  →  Category  →  Tier  →  Mode  →  Camera
```

- **Home** — 3 top-level categories
- **Category → Tier** (currently only "Non-ML CV" has tiers populated)
- **Tier → Mode** — the individual lens effect, launches the camera

### Categories

| Category | Status | What it means |
|---|---|---|
| **Non-ML CV** | Built | Classical, hand-designed algorithms — no training, deterministic |
| **ML** | Planned | Trained neural network inference on-device via `cv.dnn` (WASM) |
| **Heavy / Backend** | Planned | Face recognition specifically — client-server, Python/FastAPI on a GPU machine |

### Non-ML CV tiers and modes

**Pixel-Level Filters** — each output pixel depends only on that same input pixel (or a fixed global rule); no neighboring pixels involved.

| Mode | Technique |
|---|---|
| Invert | `bitwise_not` — 255 minus every pixel, per channel |
| Sepia | Fixed 3x3 color-transform matrix mixing R/G/B per pixel |
| Threshold | One global brightness cutoff to binary black/white |
| Emboss | Directional convolution kernel — cancels on flat regions, compounds at edges |
| Pencil Sketch | Color-dodge blend: divide sharp gray by an inverted, heavily-blurred copy of itself |
| Pixelate | Aggressive downscale (blended) + nearest-neighbor upscale (blocky, no blend) |

**Spatial Techniques** — look at neighboring pixels: convolutions, gradients, region analysis.

| Mode | Technique |
|---|---|
| Edge Detection | Canny: Sobel gradients, non-max suppression, double threshold, hysteresis |
| Edges on Gray | Same Canny pipeline, composited onto the live grayscale feed via `setTo(color, mask)` |
| Contours | `findContours` traces connected boundaries from the Canny edge map into actual traceable shapes |
| Cartoon | Bilateral filter (edge-preserving color smoothing) + adaptive-threshold outline mask |
| Color Isolation | HSV hue-range masking — one hue stays in color, everything else desaturates |
| Corner Detection | `goodFeaturesToTrack` (Shi-Tomasi) — finds points where intensity changes sharply in every direction at once |

**Motion & Temporal** — needs memory of *previous* frames, not just the current one.

| Mode | Technique |
|---|---|
| Motion Detection | `absdiff` between current and previous frame, thresholded |
| Background Subtraction | `BackgroundSubtractorMOG2` — learns a statistical background model over time |
| Light Trail | `addWeighted` iteratively blends each new frame into a running buffer — long-exposure effect |

**Applied Tools** — planned. Real product features built from the above: Document Scanner (contour detection + `warpPerspective` to flatten a page), QR/Barcode Scanner (`QRCodeDetector`).

## Performance notes worth remembering

- **Cartoon's `bilateralFilter`** is the most expensive operation in the app — mitigated by processing at 40% scale (then upscaling the result) and only running the full pipeline every 2nd frame (reusing a cached result on skipped frames).
- **Temporal modes** (Motion Detection, Background Subtraction, Light Trail) keep state in module-level variables between frames, since each processor object is a singleton reused every frame. A `reset()` method on each clears this state when switching modes, so leftover data doesn't leak between sessions.

## Roadmap

1. DONE — Foundation: camera pipeline, orientation handling, APK packaging
2. DONE — Non-ML CV: all 4 tiers structurally in place, Pixel/Spatial/Temporal populated
3. PLANNED — Applied Tools: Document Scanner, QR/Barcode Scanner
4. IN PROGRESS — ML tier: face detection (MediaPipe Tasks Vision — see `docs/ML_README.md` for the full build log), hand landmark/gesture detection next
5. PLANNED — Mode 18: a complex chained/graph-style mode combining multiple techniques from the base modes
6. PLANNED — Heavy/Backend: real-time face recognition via a Python/FastAPI backend (embedding generation + distance-based verification against enrolled reference photos)

---

## Glossary

**Channel** — one layer of an image (Red, Green, Blue, or Alpha) — a single number per pixel per channel.

**Point operation** — output depends only on that same input pixel, no neighbors involved (Invert, Threshold).

**Neighborhood operation** — output depends on a small surrounding window of pixels (blur, Emboss, edge detection).

**Kernel** — the small matrix of weights used in a convolution/neighborhood operation.

**Convolution** — sliding a kernel across an image; at each position, multiply the kernel values against the pixels underneath and sum the result into the output pixel.

**Kernel sum** — determines the operation's overall behavior: `=1` preserves brightness while smoothing (blur family), `=0` produces a signed difference signal (edge/gradient family), `>1`/`<1` brighten/darken the whole image.

**`filter2D`** — OpenCV's general-purpose function for applying any hand-specified kernel directly.

**Color transform matrix** — a per-pixel matrix multiply that mixes a pixel's own channels together into new channel values (Sepia).

**Segmentation** — dividing an image into regions based on some rule; Threshold's binary split is the simplest form.

**Interpolation** — how a resize operation fills in values that don't align with original pixel positions. `INTER_LINEAR` blends nearby source pixels (smooth); `INTER_NEAREST` just repeats the closest one (blocky).

**Downsampling / upsampling** — shrinking / growing an image's pixel grid.

**Overlapping vs. non-overlapping windows** — convolution uses overlapping sliding windows (neighboring output pixels share most of their input pixels); resize operations use non-overlapping tiled blocks (each output pixel's source block doesn't overlap its neighbor's).

**Clipping** — when a computed value falls outside the displayable 0-255 range and gets capped at the boundary; relevant whenever a kernel sums to something other than 1, or arithmetic (like Sepia's matrix multiply) can overshoot.

**Sensor noise** — small random pixel-to-pixel fluctuations from the camera hardware; blurring suppresses this by averaging it toward zero, while genuine structure (sustained across many pixels) survives.

**Bilateral filter** — a blur variant that weights each neighbor by *both* spatial distance and intensity similarity — smooths within a region of similar color, refuses to blur across a genuine boundary, because the weight for a very-different-valued neighbor collapses toward zero regardless of how spatially close it is.

**Adaptive threshold** — like `threshold`, but computes a different cutoff value for each pixel based on its own local neighborhood's average brightness, rather than one global cutoff for the whole image — copes better with uneven lighting.

**Masked compositing** — `setTo(value, mask)` or `bitwise_and(a, a, dst, mask)` style operations: conditionally overwrite pixels based on a binary mask, leaving everything else untouched. Used throughout (Edges on Gray, Color Isolation, Cartoon's outline combination).

**HSV** — Hue/Saturation/Value color space; separates *what color* (Hue) from *how vivid* (Saturation) and *how bright* (Value), making color isolation robust to lighting changes in a way RGB thresholds aren't.

**Contour** — an ordered, traceable sequence of connected boundary points forming an actual shape — distinct from raw edge *pixels*, which have no concept of connectivity or shape at all.

**Corner (Shi-Tomasi / `goodFeaturesToTrack`)** — a point where image content changes significantly in *every* direction if the viewing window is nudged, unlike a flat region (no change in any direction) or an edge (change in only one direction, perpendicular to the edge line).

**Embedding** — a fixed-length numerical vector produced by a trained neural network, representing something (like a face) such that similar inputs produce similar vectors. Central to face verification: the network is trained once on a huge generic dataset to produce good embeddings in general, then a *new* face is verified by comparing its embedding's distance to a stored reference — no retraining needed per person.

**Inference** — running an already-trained model on new input to get a prediction, as opposed to *training* (the process that produced the model's weights in the first place). Everything planned for the ML tier is inference only.

**`Mat`** — OpenCV's core image/array data structure. In OpenCV.js specifically, every `Mat` lives in WebAssembly's linear memory, not JavaScript's garbage-collected heap — must be manually `.delete()`d or memory leaks until the app crashes.
