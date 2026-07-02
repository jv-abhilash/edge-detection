# Part 2 — Category Restructure + Pixel-Level & Spatial Filters

## Why restructure into categories?
The project's roadmap has three distinct technical phases: classical CV
(hand-designed algorithms, no training), on-device ML (a trained model
running inference via OpenCV's DNN module), and client-server face
recognition (offloaded to a Python/FastAPI backend for GPU power). The
Home screen now reflects this directly:

```
Home → Category (Non-ML CV / ML / Heavy-Backend) → Tier → Mode → Camera
```

`ML` and `Heavy / Backend` are visible but disabled ("coming next") —
placeholders for Parts 3+ of the roadmap, not yet implemented.

## Why tiers within Non-ML CV?
Not all classical techniques are equally complex. Grouping by *how* a
technique looks at the image, not just what it produces, makes the
learning progression explicit:

| Tier | What defines it | 
|---|---|
| **Pixel-Level Filters** | Each output pixel depends only on that same input pixel (or a fixed global rule) — no neighboring pixels involved at all |
| **Spatial Techniques** | Looks at neighboring pixels — convolutions, gradients, region analysis — to find structure |
| **Motion & Temporal** | Needs memory of *previous* frames, not just the current one (Part 3, not yet built) |
| **Applied Tools** | Real product features composed from the techniques above — document scanning, QR reading (Part 4, not yet built) |

## New modes this part

### Pixel-Level Filters tier
| Mode | Technique | Why it's named that |
|---|---|---|
| **Pencil Sketch** | Color-dodge blend: divide grayscale by an inverted, heavily-blurred copy of itself | The dodge blend produces soft shading + dark outlines that reads as hand-drawn |
| **Sepia** | Fixed 3×3 color-transform matrix on RGB channels | Named for the warm brown tone of sepia-toned antique photographs |
| **Invert** | `bitwise_not` — 255 minus every pixel | Literally inverts (negates) every color value — a photographic "negative" |
| **Threshold** | One global cutoff via `cv.threshold`; brighter → white, darker → black | Named for the single threshold value that separates the two output states |
| **Emboss** | Directional convolution kernel (negative one side, positive the other) | Produces a raised/carved 3D relief look, like embossed paper or metal |
| **Pixelate** | Aggressive downscale + `INTER_NEAREST` upscale (blocky, no smoothing) | Named for the visibly enlarged, blocky individual pixels ("mosaic" effect) |

### Spatial Techniques tier (new additions)
| Mode | Technique | Why it's named that |
|---|---|---|
| **Color Isolation** | Convert to HSV, `inRange` mask on a hue band, desaturate everything outside it | Isolates one hue range in full color while the rest turns gray |
| **Corner Detection** | `goodFeaturesToTrack` (Shi-Tomasi method) | Finds actual *corners* — points where intensity changes sharply in two directions at once, unlike Canny which marks every edge pixel regardless of direction |

## Reused UI trick: sliders as multi-purpose controls
Rather than building bespoke parameter UI per mode, several new modes
reinterpret the existing low/high threshold sliders:
- **Threshold** mode: "low" slider *is* the binary cutoff value (0–255); "high" is unused in this mode
- **Color Isolation**: "low" slider picks the target hue center (mapped from 0–255 UI range to OpenCV's 0–179 hue range), "high" controls tolerance width around it

## Info tooltip system (`InfoTip` component)
Every mode/tier/category card now carries a small "i" badge in its corner.
- **Desktop:** hover to reveal a short explanation of the technique and
  why it's named what it's named
- **Mobile:** long-press (~450ms) to reveal the same tooltip, auto-hiding
  ~2.5 seconds after release

This keeps the actual card tap-target free for launching the mode, while
still surfacing the "why is this called that" explanations requested
directly in the UI rather than only in these docs.

## Performance note carried over from Part 1
Cartoon mode's `bilateralFilter` remains the most expensive operation in
the app. It uses two techniques to stay real-time: processing at 40% scale
before upscaling the result, and only running the full pipeline every 2nd
frame (reusing a cached result on the frames in between). Neither trick was
needed for any Part 2 addition — Pixelate, Color Isolation, and Corner
Detection are all cheap enough to run at full frame rate untouched.
