# ML Tier — Build Log, Hurdles, and Resolutions

A full record of building on-device face detection: what was tried, what
broke, how each failure was diagnosed, and what the final working
architecture looks like. Kept as a reference for future debugging and for
understanding the reasoning that led here — not just the end result.

---

## Goal

Move beyond classical, hand-designed CV algorithms (Non-ML CV tier) into
genuine trained-model inference, running entirely on-device, starting with
face detection. This tier's real purpose is proving out the integration
pattern needed later for Hand Landmark detection (Mode 18's actual target).

---

## Attempt 1 — DNN Face Detection ("Heavy"): OpenCV's `dnn` module

**Model:** `res10_300x300_ssd_iter_140000_fp16.caffemodel` (Caffe SSD,
ResNet10 backbone) — OpenCV's own commonly-used face detector.

### Hurdle 1.1 — wrong OpenCV.js build entirely
The npm package `@techstark/opencv-js` (used for every classical CV mode)
turned out to be a **trimmed build with no `dnn` module at all** —
confirmed by grepping the bundled file for `readNetFromCaffe` and finding
zero matches, despite the runtime loading fine for every other mode.

**Fix:** switched to the *official* OpenCV.js build (self-hosted from
`docs.opencv.org`, includes `dnn` by default), loaded via a `<script>` tag
instead of the npm import, with `window.cv` referenced globally instead of
an ES import.

### Hurdle 1.2 — wrong color channel order
Faces weren't detected at all. Root cause: `blobFromImage`'s `swapRB` was
`false`, but this Caffe model expects BGR input while our Mat was RGB —
every color channel was scrambled going into the network.

**Fix:** `swapRB: true`.

### Hurdle 1.3 — `readNetFromCaffe` expects file paths, not raw content
Passing the prototxt as a text string, then as a raw byte buffer, both
failed with `Can't open "input: \"data\"...`  — the error revealed the
function was trying to *open the file content itself as a filename*.

**Root cause:** this binding requires files to exist on OpenCV.js's
**virtual in-memory filesystem** (a real Emscripten `FS`, not your disk) —
call sites take *paths*, not content.

**Fix:** `cv.FS_createDataFile('/', path, bytes, ...)` to write both the
prototxt and the model weights into the virtual FS first, then call
`readNetFromCaffe(protoPath, modelPath)` with string paths.

### Hurdle 1.4 — WASM memory exhaustion crashing unrelated code
Running `net.forward()` every single frame eventually crashed with
`RuntimeError: memory access out of bounds` — inside `cv.imread()`, a
completely unrelated function. DNN inference allocates far more memory
per call than any classical CV op; repeated allocation was exhausting or
fragmenting the WASM heap.

**Fix:** throttled inference to run only every Nth frame (`inferenceInterval`),
caching detected boxes and redrawing them on the frames in between.

### Hurdle 1.5 — attempted resolution reduction, hit a hard wall
Tried resizing the network's input from 300×300 to 150×150 (same trained
weights, theoretically ~4× less compute) to speed up the ~4-6 second
inference time. Result: `Assertion failed) s >= 0 in function 'setSize'`
— some internal layer computed a negative dimension. This specific
prototxt's architecture doesn't generalize cleanly to arbitrary input
sizes the way a fully generic SSD would.

**Resolution:** reverted to 300×300. Accepted the ~4-6 second inference
time as a hard limit of this specific model + OpenCV.js's `dnn` module —
this constraint is what motivated trying MediaPipe (Attempt 3).

### Final state
Correct, reliable, but slow (~4-6s/inference). Running inside a **Web
Worker** so the UI never freezes even at that speed — see the Threading
Lessons section below, since the same Worker-isolation technique used
here reappears (and gets much more thoroughly debugged) in Attempt 3.

---

## Attempt 2 — DNN Face Detection ("Lite"): a lighter ONNX model

**Model:** Ultra-Light-Fast-Generic-Face-Detector (~1MB ONNX, purpose-built
for mobile — chosen specifically because Attempt 1 was too slow).

### Hurdle 2.1 — same virtual-filesystem path issue as Caffe
`readNetFromONNX` needed the same `FS_createDataFile` + path treatment as
`readNetFromCaffe` did in Attempt 1.

### Hurdle 2.2 — no built-in output decoding
Unlike the Caffe model's `DetectionOutput` layer (which decodes boxes and
runs NMS internally), this ONNX model outputs **raw anchor-box
adjustments** — hand-written decoding math was required: generating the
model's ~4420 fixed "prior" reference boxes, converting predicted
offsets into actual coordinates, and implementing non-max suppression
from scratch.

### Hurdle 2.3 — unsupported multi-output `forward()` signature
`net.forward(outputsVector, namesList)` threw "invalid number of
arguments" — this OpenCV.js binding only supports `forward()` (0 args) or
`forward(name)` (1 arg), no multi-output overload.

**Fix:** called `forward('boxes')` and `forward('scores')` separately.

### Hurdle 2.4 — confidence threshold too permissive
Once running, dozens of false-positive boxes appeared on empty
background. The default 0.2 threshold (fine for the well-calibrated
Caffe model) was far too loose for this model's noisier output.

**Fix:** raised the effective floor to 0.75.

### Hurdle 2.5 — unresolved accuracy bug
Even at 0.75 threshold, confidently wrong detections persisted (a flower
scoring 0.99 "face"). Two theories tested and ruled out:
- **Channel order** (`swapRB`) — flipping it made results *worse*, not
  better, ruling this out
- **Reversed class index** — logged both score-array indices side by side;
  the data pattern (one index consistently near-1.0 everywhere, the other
  genuinely varying with content) was actually consistent with the
  original assignment being correct, not reversed

**Resolution:** left unresolved, marked `(WIP)` in the UI. Likely a subtle
bug in the hand-written anchor-decoding math that would need further
isolated testing to pin down. Superseded by Attempt 3 before returning to
debug this further.

---

## Attempt 3 — MediaPipe Tasks Vision (the one that actually worked well)

**Why switch at all:** OpenCV's `dnn` module is a generic C++ engine with
no mobile-specific optimization. MediaPipe's BlazeFace model + XNNPACK
WASM runtime is purpose-built for exactly this job, with internal box
decoding/NMS (no more hand-written anchor math), and is used in production
by a large number of real shipped apps.

### Hurdle 3.1 — asset paths inside `node_modules`
Self-hosting required copying the WASM runtime files and the `.tflite`
model into `public/`, matching the pattern already used for OpenCV.js and
the Caffe model.

### Hurdle 3.2 — whole-app freeze from a static top-level import
The very first integration attempt used a static
`import { FaceDetector } from '@mediapipe/tasks-vision'` at the top of the
processor file. Since `processors/index.js` is loaded immediately at app
launch (Home screen needs it for category counts), this executed
MediaPipe's code **the instant the app opened**, for every screen — not
just when the mode was selected.

**Fix:** switched to a dynamic `await import('@mediapipe/tasks-vision')`
*inside* the init function — Vite automatically code-split this into its
own lazily-loaded chunk.

### Hurdle 3.3 — the real freeze: OpenCV.js + MediaPipe sharing the main thread
Even with the lazy import, entering the mode froze the whole app,
requiring a relaunch. Debugging this required a genuinely different
approach — **isolation testing**: building tiny standalone HTML pages
(`mediapipe-test.html`, outside the whole app) that tested only the
narrow question at hand, without React, Capacitor, or the camera pipeline
in the way.

- **Test A** (MediaPipe alone, no OpenCV): succeeded instantly, on both
  desktop Chrome and phone Chrome, in ~600ms.
- **Test B** (load OpenCV.js first, *then* MediaPipe, same page): hung at
  the exact same point the real app did.

This was the actual proof: **two large Emscripten-compiled WASM runtimes
sharing one JavaScript global scope conflict with each other** — both
commonly use generic internal variable names (`Module`, heap arrays, etc.)
without expecting a second instance to coexist.

**Fix (architecturally correct):** move MediaPipe into its own dedicated
**Web Worker** — a separate JS execution context with its own global
scope, communicating with the main thread only via `postMessage`. Workers
have no DOM access, so `detectForVideo(videoElement)` had to become
`detect(imageData)`, fed via a transferred pixel buffer (the same pattern
already used for the DNN Workers in Attempts 1-2).

### Hurdle 3.4 — doubled asset path
The first Worker attempt threw a real, catchable error for the first
time: `Failed to fetch .../mediapipe/mediapipe/vision_wasm_nosimd_internal.js`
— a **doubled path**. Relative paths (`./mediapipe/...`) get resolved
again internally when MediaPipe's own loader chains further fetches,
compounding into a duplicate.

**Fix:** switched to absolute paths (`/mediapipe/...`).

### Hurdle 3.5 — "ModuleFactory not set"
With the path fixed, a new, different error appeared. This is a MediaPipe
error specific to its Emscripten-generated WASM loader: that loader script
sets up a global factory function as a side effect of executing — and the
mechanism used to load it (browser-side) makes all the difference.

**Root cause:** the Worker was created as a **module** Worker
(`{ type: 'module' }`), needed to use clean `import`/`export` syntax for
MediaPipe's own library file. But **module Workers completely disallow
`importScripts()`** — and that's exactly the mechanism MediaPipe's
internal WASM loader relies on. The loader script never actually executed;
its global factory assignment never happened.

**Fix:** switched to a **classic** Worker (no `{ type: 'module' }`),
restoring `importScripts()` for MediaPipe's internal use — while still
loading MediaPipe's own ES-module library file via **dynamic `import()`**
(the function-call form, which — unlike a static `import ... from`
declaration — works fine even in classic Workers).

### Final architecture
```
Main thread                          Worker thread (classic, not module)
├── OpenCV.js (all other modes)      ├── dynamic import('@mediapipe/tasks-vision')
├── Camera capture loop              ├── FilesetResolver.forVisionTasks() (auto-detect)
└── postMessage(pixel buffer) ──────→├── FaceDetector.createFromOptions()
    ←────── postMessage(boxes) ──────┴── detect(imageData) per frame
```

### Result
- Inference: **~30-100ms** per detection (after a one-time ~570ms warmup),
  versus Attempt 1's ~4000-6000ms — roughly a 50-100× improvement
- Accurate: correctly toggles between 0 and 1 detected face as a real
  face enters/leaves frame, no false positives on background objects
- No freeze, ever — even during the ~600ms initial model load, the main
  thread (and the live camera preview) never blocks

---

## Debugging methodology worth remembering

**Isolation testing was the single most valuable technique used.**
Whenever a bug couldn't be pinned down inside the full app (camera +
React + Capacitor + OpenCV all running together), building a minimal
standalone HTML page that removed every variable except the one in
question got a real answer in minutes instead of hours of guessing
through remote-debugging the full app each time.

**Exception pointer decoding.** OpenCV.js's official build often disables
full C++ exception unwinding — genuine internal errors surface as a raw
memory pointer (just a number) instead of a readable message. `cv.exceptionFromPtr(ptr).msg`
decodes it back into the real error text. Without this, several bugs in
this log would have been undiagnosable "it just throws a number" dead ends.

**Real error messages beat theories, every time.** Several plausible-sounding
theories were tested and **wrong** — SIMD instruction incompatibility,
missing cross-origin-isolation headers — before the actual causes
(OpenCV/MediaPipe global-scope conflict, then the module-vs-classic Worker
`importScripts()` restriction) were found. The moment a *decoded, specific*
error message appeared (the doubled path; "ModuleFactory not set"), the
fix followed directly. Chasing silent hangs without a concrete error to
read is far slower than getting a real message first, even if that means
adding more logging before attempting another fix.

**`chrome://inspect` remote debugging** (Ubuntu Chrome → phone) was
essential throughout — console logs and Network tab timing from the
actual device were what distinguished real hangs from merely-slow
operations, and confirmed exactly which network requests completed versus
never fired.

---

## Glossary — new terms from this tier

**Web Worker** — a separate JavaScript execution thread with its own
global scope; communicates with the main thread only via `postMessage`.
Two kinds: **classic** (traditional, supports `importScripts()`) and
**module** (`{ type: 'module' }`, supports `import`/`export` syntax, but
disallows `importScripts()` entirely).

**`importScripts()`** — the classic-Worker mechanism for loading another
script into the same Worker's global scope, executing it synchronously.
Many older Emscripten-generated WASM loader scripts depend on this
specific mechanism to set up their global factory functions.

**Dynamic `import()`** — the function-call form of ES module import
(`await import('...')`), as opposed to the static `import ... from '...'`
declaration. Works in both classic and module Workers; static `import`
only works in module Workers (and the main document).

**WASM instantiation** — the step where a browser takes downloaded
`.wasm` bytes and actually compiles + prepares them to run. Distinct from
merely *downloading* the file — a `.wasm` file can complete its network
request successfully while instantiation itself still hangs or fails.

**`FilesetResolver`** — MediaPipe's own auto-detecting asset resolver;
picks the appropriate WASM variant (SIMD vs non-SIMD) and constructs
correct loader/binary paths. Preferred over manually hardcoding paths,
since manual overrides can bypass loading mechanisms the library expects.

**XNNPACK delegate** — the optimized CPU inference backend MediaPipe uses
under the hood; the `delegate: 'CPU'` option in `baseOptions` selects it
explicitly (as opposed to a GPU delegate, which isn't reliably supported
inside an Android WebView).

**Cross-origin isolation (COOP/COEP headers)** — `Cross-Origin-Opener-Policy`
and `Cross-Origin-Embedder-Policy` response headers, required to enable
`SharedArrayBuffer` in a browser. Tested as a theory for the MediaPipe
hang; turned out not to be the actual cause here, but worth knowing about
for any future WASM threading work.
