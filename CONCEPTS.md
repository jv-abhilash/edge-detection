# Concepts Learned — Summary & Interconnections

A consolidated reference of everything covered before moving into
Motion & Temporal. Organized by concept, with explicit notes on how
techniques connect to each other — the goal is seeing this as one
coherent system, not 17 unrelated tricks.

---

## 1. The foundational split: point operations vs. neighborhood operations

Every technique covered falls into exactly one of these two buckets, and
recognizing which bucket you're in tells you most of what you need to
know about how it behaves.

**Point operations** — output depends only on that exact same input pixel.
No neighbors, no spatial awareness at all.
- Invert (`255 - value`)
- Threshold (`> cutoff ? 255 : 0`)
- Sepia (combines a pixel's own R/G/B with each other — still "no
  neighbors" in the spatial sense, since no *other* pixel positions are
  involved, just that one pixel's three channels)

**Neighborhood operations** — output depends on a window of surrounding
pixels.
- Blur (Gaussian, median, bilateral)
- Edge/gradient kernels (Sobel, Emboss)
- Anything built on convolution or local windowed analysis (corner
  detection, adaptive threshold)

This split is the first question worth asking about any new technique:
*does it need to look around, or just at itself?*

---

## 2. Convolution — the shared mechanism behind most neighborhood operations

Slide a kernel across the image; at each position, multiply-and-sum the
kernel against the pixels underneath. This single mechanism, with
different kernel *shapes*, produces:

| Kernel property | Result |
|---|---|
| All positive, sums to 1 | Blur — averages away local spikes, preserves overall brightness |
| Mixed sign, sums to 0 | Pure edge/gradient signal — zero on flat regions, positive/negative on transitions |
| Mixed sign, sums to 1 (Emboss) | Flat regions return their *original* value (not zero); edges compound into a strong signed response |
| Any sum ≠ 1 (uncorrected) | Systematically brightens or darkens the whole image |

**Fixed vs. adaptive kernels — the important refinement:**
- **Fixed kernel**: the same numbers, reused unchanged at every pixel
  position (Gaussian blur, Emboss, Sepia's matrix). Fast, predictable,
  but blind to what's actually in the image.
- **Adaptive kernel**: weights recalculated per-pixel from local content.
  Bilateral filter adapts its weights based on intensity similarity
  (down-weighting neighbors that differ too much — i.e., across a real
  edge). Adaptive threshold recalculates its cutoff per-pixel from local
  average brightness. Same underlying idea — "adjust to what's actually
  here" — applied to two different operations.

---

## 3. Blur has two genuinely different jobs — don't conflate them

**Job 1 — cleanup before detection.** Small-to-medium kernel, applied
*before* a separate detection step, exists purely to remove sensor noise
so that step works more accurately. You never see the blurred image
itself in the final output. This is Canny's Gaussian blur — feeds into
Sobel, which feeds into the rest of the Canny pipeline.

**Job 2 — generative/comparative use.** The blur result is directly
visible in the output, or compared against the sharp original to *create*
an effect. Larger, more aggressive kernels are common here since visible
softness is the goal, not just noise suppression.
- Cartoon's bilateral filter — its smoothed output *is* the flat-color
  look
- Pencil Sketch's 21×21 Gaussian blur — creates a "glow" reference that,
  when divided against the sharp original, reveals edges as dark bands

**The interconnection worth noticing:** Pencil Sketch's blur→invert→divide
sequence and Canny's blur→gradient→threshold sequence are structurally
similar — both use blur to build *something to compare the sharp image
against*, then extract signal from where sharp and smoothed disagree. Canny
does this via literal derivative math (Sobel); Pencil Sketch does it via
division. Different math, same underlying idea: **edges are revealed by
disagreement between a sharp version and a smoothed version of the same
image.**

---

## 4. Detection vs. representation — pixels vs. shapes

Canny (and any edge detector) answers **"which pixels are edges?"** — a
grid of yes/no per-pixel classifications, with zero concept of
connectivity or shape.

`findContours` answers **"what shapes do those edge pixels form?"** — an
ordered, connected sequence of coordinates you can measure, count, or
simplify. This is a genuinely different *kind* of output (a data
structure describing objects) built *on top of* the first kind (a binary
image). The same pattern — raw per-pixel signal, then a second pass that
organizes it into something structured — recurs conceptually once you get
to face/object detection: a DNN's raw output is per-region confidence
scores, and a further step (non-max suppression, again) turns that into
clean bounding boxes.

---

## 5. Masked compositing — one pattern, reused three times

`setTo(value, mask)` and `bitwise_and(a, a, dst, mask)` both do the same
job: **conditionally overwrite pixels where a binary mask says yes, leave
everything else untouched.** This exact pattern shows up in:
- **Edges on Gray** — paint highlight color only where Canny's edge mask is true
- **Color Isolation** — keep color where the HSV hue mask matches, gray elsewhere
- **Cartoon** — force pixels to black where the adaptive-threshold outline mask fired

Once you recognize this as one reusable pattern rather than three separate
tricks, building a new "highlight X, do something else everywhere else"
mode becomes mostly about choosing what generates the mask (Canny? HSV
range? something else entirely), not reinventing the compositing logic.

---

## 6. Color spaces — solving different problems

**RGB** — how displays produce color; poor for isolating "what color is
this" since brightness and color are tangled together.

**Grayscale** — collapses color entirely via a weighted sum, keeping only
structural/brightness information. Used whenever a technique cares about
shape/edges, not color (Canny, Emboss, Corner Detection all operate on
grayscale, not color).

**HSV** — separates hue (color identity) from saturation (vividness) and
value (brightness), making color-based isolation robust to lighting
changes that would break a simple RGB threshold.

---

## 7. Corner detection's actual test

Flat region: content doesn't change no matter which direction you nudge a
small window. Edge: content changes strongly in one direction
(perpendicular to the edge), stays stable in the other (along the edge).
Corner: content changes strongly in *every* direction — no "safe" nudge
direction exists. `goodFeaturesToTrack` scores every pixel by this
"worst-case direction of change" and keeps only the strongest, well-
separated results.

---

## 8. The classical CV → deep learning bridge

Classical CV kernels are hand-designed by a human who worked out the
math (you typed Emboss's 9 numbers yourself). A CNN's kernels are the
*same mechanism* — sliding-window multiply-and-sum — but the numbers are
**learned automatically** through training rather than chosen by hand,
and many kernels run in parallel per layer, stacked across many layers,
so early layers often converge on edge/blob detectors resembling Sobel
and Gaussian, purely because gradient descent finds those genuinely
useful as building blocks — nobody tells the network to build them.

**Training vs. inference — the key practical distinction for your face
recognition plan:** a network is trained *once*, on a huge generic
dataset, to become a good general-purpose "face → fingerprint vector"
converter (an embedding model). Enrolling a specific person (you) never
retrains anything — it just runs that fixed, already-trained function on
a few photos and stores the resulting vector. Verifying later is running
the same fixed function again and checking distance against the stored
vector. This is why face verification needs only a handful of enrollment
photos, while classification-style training needs enormous labeled
datasets — they're solving fundamentally different problems (build a
general fingerprint-generator, vs. carve up input space into fixed
known categories).

---

## How this all connects to your app's tier structure

- **Pixel-Level Filters** = pure point operations, or simple fixed
  convolution kernels — cheapest, no adaptiveness
- **Spatial Techniques** = neighborhood operations, several of them
  *adaptive* (bilateral filter, adaptive threshold) — more expensive,
  more context-aware
- **Motion & Temporal** (next) = the same neighborhood/point-operation
  toolkit, but applied *across* frames instead of within one — genuinely
  new territory since it requires memory, not just more clever math on a
  single frame
- **ML tier** (later) = the same convolution mechanism again, but with
  learned rather than hand-designed kernels, and inference rather than
  training

Nothing in the upcoming tiers is a clean break from what you've already
learned — Motion & Temporal reuses point/neighborhood thinking with an
added time dimension, and ML reuses convolution with learned weights
instead of hand-picked ones.
