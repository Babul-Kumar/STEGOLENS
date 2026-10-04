# StegoLens: Technical Viva & Academic Demonstration Guide

This guide is designed for technical demonstrations, academic viva voce examinations, code reviews, and defense presentations for **StegoLens** ("Detect What Images Hide").

---

## 1. What Steganography Is

**Steganography** (from the Greek *steganos*, meaning "covered" or "concealed", and *graphein*, meaning "writing") is the art and science of hiding communication. Unlike **cryptography**, which conceals the *meaning* of a message while leaving the existence of the ciphertext evident, steganography conceals the *very existence* of the message within an innocuous cover medium (such as a digital image, audio file, or network packet).

In digital images, steganography embeds covert payloads by perturbing:
- **Spatial domain data**: Altering the least significant bits (LSB) of raw pixel intensities.
- **Transform domain data**: Modifying quantized Discrete Cosine Transform (DCT) coefficients in JPEG images (e.g., Jsteg, OutGuess, F5, JPHide).
- **Format structure/Metadata**: Appending data beyond the image End-Of-Image marker (EOF/EOI injection) or utilizing unused header chunks.

The primary objective is undetectable covert communication, where an eavesdropper cannot statistically or visually distinguish the stego-object from a pristine cover object.

---

## 2. What Steganalysis Is

**Steganalysis** is the counterpart and countermeasure to steganography: the detection, extraction, and attribution of hidden payloads within carrier objects.

Steganalysis is broadly categorized into:
1. **Targeted Steganalysis**: Designed to exploit specific mathematical or structural fingerprints left by known steganographic embedding algorithms (e.g., Pairs-of-Values chi-square analysis for sequential LSB embedding).
2. **Blind (Universal) Steganalysis**: Model-based approaches that make few assumptions about the embedding tool, instead training classifiers (such as Convolutional Neural Networks or ensemble classifiers) on rich spatial/frequency residuals to distinguish altered distributions from natural image statistics.

StegoLens fuses both paradigms: **deterministic forensic extraction** (targeted algorithms, structural container parsing, bit-plane decomposition) alongside **deep learning steganalysis** (EfficientNet-B0 trained on ALASKA2 residuals).

---

## 3. Why LSB Analysis Is Useful

In 8-bit color channels (0 to 255), the Least Significant Bit (Bit 0) represents a value change of only $1$. Visually, altering bit 0 causes an intensity shift undetectable to human vision (just-noticeable difference thresholds). Consequently, simple steganography overwrites bit 0 with message bits.

LSB analysis in StegoLens evaluates:
- **Bit 0 Distribution**: In natural images, natural gradients produce asymmetric distributions between 0s and 1s across adjacent pixels. Uncorrelated encrypted or compressed payloads approach an identical 50/50 balance (0.5000 bit-1 frequency), driving LSB entropy to 1.0.
- **Bitwise Transitions & Flips**: StegoLens calculates the exact percentage of 1s in the LSB plane across each channel (R, G, B) to detect unnatural uniform random distributions.

---

## 4. Why Entropy Is Useful

Entropy, formulated by Claude Shannon, measures the average information density, uncertainty, or randomness of a distribution:

$$H(X) = - \sum_{i=0}^{255} P(x_i) \log_2 P(x_i)$$

Where $P(x_i)$ is the empirical probability of pixel intensity $x_i$ appearing in the image.

### Pixel Intensity Entropy vs. Raw Byte Entropy
- **Pixel Intensity Entropy** (0 to 8 bits/pixel) measures the randomness of the grayscale or color luminance distribution across the image grid. Natural photographs with broad dynamic range typically register between 6.5 and 7.6. Extreme values (e.g. > 7.95) across noisy regions can signal high-frequency perturbations, whereas values < 4.0 indicate flat, synthetic, or quantized surfaces.
- StegoLens measures Shannon Pixel Intensity Entropy vectorially with NumPy, providing benchmarked expectations for forensic baseline profiling.

---

## 5. Why Chi-Square Analysis Is Useful

The **Pairs of Values (PoV)** Chi-Square test (first formalized by Westfeld and Pfitzmann) is the classic statistical attack against sequential and pseudorandom LSB embedding.

When embedding bits into LSBs, even pixel values $2k$ and odd values $2k+1$ (e.g., 10 and 11, 12 and 13) are flipped into one another. Under high embedding rates, the observed frequencies $n_{2k}$ and $n_{2k+1}$ are equalized toward their mean:

$$n_k^* = \frac{n_{2k} + n_{2k+1}}{2}$$

The Chi-Square statistic is evaluated over all 128 pairs:

$$\chi^2 = \sum_{k=0}^{127} \frac{(n_{2k} - n_k^*)^2}{n_k^*}$$

StegoLens computes the degree of freedom ($k=127$) and the corresponding **$p$-value** using the Wilson-Hilferty transformation of the chi-square cumulative distribution function. A $p$-value approaching $1.0$ (or near $0$ deviation) indicates theoretical equalization characteristic of LSB steganography, serving as a primary forensic signal.

---

## 6. Why Bit Planes Are Useful

An 8-bit grayscale image consists of 8 binary bit planes, from Plane 0 (LSB) to Plane 7 (Most Significant Bit - MSB):

- **Planes 7, 6, 5 (High Order)**: Dominated by structural image semantics, edges, lighting, and shapes.
- **Planes 4, 3, 2 (Mid Order)**: Subtle textures and smooth shading gradients.
- **Planes 1, 0 (Low Order / LSB)**: In natural raw photographs, Plane 0 exhibits subtle correlation with scene contours due to sensor noise and lighting continuity.
- In steganographic images where LSB replacement or matching has occurred, Plane 0 completely loses its spatial correlation with the higher bit planes and turns into visual pseudo-random white noise (salt-and-pepper grain).

StegoLens extracts binary bit planes, computes their bit-1 frequencies, and renders visual thumbnails of Plane 0 (LSB) and Plane 7 (MSB) for human-in-the-loop forensic comparison.

---

## 7. Why Container Analysis Matters

Steganography does not always hide within pixel values; attackers frequently manipulate file container formats:
- **JPEG**: The standard specifies that after the End-Of-Image marker (`0xFF 0xD9`), image decoders stop reading. Any bytes appended after `FF D9` are ignored by standard photo viewers, creating an ideal hidden channel for trailing payloads (append steganography / overlay data).
- **PNG**: PNG files are organized into chunks: `IHDR`, `IDAT`, `IEND`. Attackers inject hidden data into custom ancillary chunks (e.g. `tEXt`, `zTXt`, or custom four-letter chunk names) or append bytes after the terminating `IEND` chunk (`0x49 0x45 0x4E 0x44 0xAE 0x42 0x60 0x82`).
- **WEBP & BMP**: WEBP RIFF chunk length mismatches and BMP header-declared file sizes vs. actual disk size expose trailing injection payloads.

StegoLens performs binary structural parsing of container headers and markers to compute the exact payload injection offset and trailing byte volume.

---

## 8. Why Payload Signatures Are Useful

Attackers frequently embed pre-packaged archives or executable scripts (ZIP files, TAR, GZIP, PDFs, Windows PE/MZ executables, or Linux ELF binaries) inside images.

StegoLens uses a dual-zone payload signature scanner:
1. **Trailing Zone (`SIGNATURE_IN_TRAILING_DATA`)**: Magic byte matches found after the canonical EOF/EOI marker (e.g., `PK\x03\x04` for ZIP or `%PDF` for PDF). This provides definitive proof of non-image payload attachment and is assigned maximum forensic weight (+40 points).
2. **Stream Zone (`SIGNATURE_IN_IMAGE_STREAM`)**: Matches found inside the raw compressed JPEG or PNG byte stream. Because high-entropy compressed streams can occasionally yield accidental 4-byte collisions with magic numbers, StegoLens conservatively classifies these with lower weight (+10 points) without making false-positive claims.

---

## 9. Why Heuristic Scoring Is Not Proof

A statistical anomaly or high heuristic suspicion score is **corroborating evidence, not judicial proof**.

- High pixel entropy can be caused by natural high-frequency textures (sand, foliage, water ripples, astrophotography noise).
- A 50% LSB ratio can occur naturally in well-exposed photographs.
- Lossy recompression and dithering algorithms alter histogram distributions.

Therefore, forensic integrity demands clear distinction:
> StegoLens asserts that indicators are **consistent with possible steganographic manipulation**, but never claims an image definitely contains a secret message unless an authentic payload has been extracted, decoded, and verified.

---

## 10. Why Machine Learning Is Useful

Traditional deterministic tests (such as Chi-Square or LSB testing) fail when modern adaptive steganography algorithms are employed. Adaptive steganography tools (such as **HUGO**, **S-UNIWARD**, **WOW**, and **J-UNIWARD**) do not embed sequentially or uniformly across all pixels. Instead, they model pixel cost functions and embed message bits exclusively into complex textures, noisy areas, and sharp edges where statistical deviations are visually and mathematically masked.

Deep learning architectures (Convolutional Neural Networks) learn high-dimensional spatial correlations and residual features that span across pixels, detecting the subtle spatial distortion patterns introduced by modern adaptive cost algorithms that bypass elementary statistical tests.

---

## 11. How EfficientNet-B0 Is Used

StegoLens employs an **EfficientNet-B0** convolutional neural network backbone, originally developed and validated under the prestigious **ALASKA2 Image Steganalysis** benchmark:
- **Architecture**: Compound-scaled CNN with inverted bottleneck MBConv blocks and Squeeze-and-Excitation attention mechanisms.
- **Model Adaptation**: The classifier head is configured for single-output logit prediction (`num_classes=1`), outputting a scalar logit passed through a Sigmoid activation:
  $$P(\text{stego}) = \sigma(z) = \frac{1}{1 + e^{-z}}$$
- **Execution Boundary**: PyTorch CPU inference is contained within an isolated Python subprocess bridge (`ml_engine.py`), preventing memory leaks and process crashes from degrading the core Node.js server.

---

## 12. How Preprocessing Works

Neural networks are exquisitely sensitive to input pipeline mismatches. To guarantee mathematical reproducibility with training:
1. **Image Decoding**: Loaded via Pillow (`PIL.Image.open`) and explicitly converted to 3-channel RGB (`.convert('RGB')`).
2. **Spatial Resizing**: Resized to exactly $512 \times 512$ pixels using bilinear interpolation (`Image.Resampling.BILINEAR`), matching the ALASKA2 image dimension specifications.
3. **Tensor Normalization**: Pixel values are mapped to float tensors in $[0.0, 1.0]$, followed by channel-wise standardization using ImageNet parameters documented in `model/normalization.json`:
   - Mean: $\mu = [0.485, 0.456, 0.406]$
   - Standard Deviation: $\sigma = [0.229, 0.224, 0.225]$
4. **Decision Boundary**: Predictions utilize an empirically calibrated decision threshold of $0.22$ from ALASKA2 validation, accounting for class imbalance in real-world forensic deployment.

---

## 13. How Forensic + ML Evidence Are Presented

StegoLens avoids the naive mistake of averaging unrelated metrics. It maintains strict architectural separation:

```
+--------------------------------------------------------------+
|                     EVIDENCE AGGREGATION                     |
+--------------------------------------------------------------+
| 1. Forensic Heuristic Engine  ->  0-100 Score & Finding Tags |
| 2. Deep Learning Steganalysis ->  0.0-1.0 Probability & Class |
| 3. Evidence Aggregator        ->  Synthesis Narrative        |
+--------------------------------------------------------------+
```

The system presents:
- **Forensic Score**: Deterministic evidence (container breaks, trailing bytes, LSB anomalies, chi-square).
- **ML Score**: Neural network pattern recognition over residual pixel noise.
- **Overall Assessment**: A synthesized narrative:
  - *Both elevated*: "Forensic indicators and ML steganalysis both indicate high probability of modification."
  - *Forensic high / ML low*: "Structural container anomalies detected (e.g. trailing data), though pixel-level steganography was not detected by the model."
  - *ML high / Forensic low*: "Deep learning detected subtle spatial residual distortions consistent with adaptive steganography."
  - *Both low*: "No anomalies detected; characteristics consistent with unmodified cover imagery."

---

## 14. Security Controls in StegoLens

Because StegoLens processes arbitrary, potentially malicious files uploaded by untrusted users, security hardening is applied at every tier:

1. **Size Enforcement**: Strict 15 MB request ceiling enforced at the HTTP middleware boundary.
2. **Magic Byte Verification**: Verifies true file signatures (`0xFF 0xD8 0xFF` for JPEG, `0x89 0x50 0x4E 0x47` for PNG, etc.) rather than trusting file extensions or MIME headers.
3. **Decompression Bomb Protection**: Pillow safety limits capping images at $8192 \times 8192$ pixels and $50,000,000$ total pixels to mitigate Denial of Service (DoS) memory exhaustion.
4. **Path Traversal Defense**: File basenames are sanitized, paths are resolved strictly within designated sandbox directories, and files are stored with random UUID filenames.
5. **Ephemeral Storage Lifecycle**: Uploaded carrier images are unlinked immediately inside `finally` blocks upon completion of analysis; zero user images remain stored on disk.
6. **Network Hardening**: Strict CORS configuration, Helmet security headers, API rate limiting, and parameterized SQL queries to prevent SQL injection.

---

## 15. Real-World Limitations

In accordance with scientific and academic honesty, StegoLens documents clear operational limitations:

1. **Container Loss in Social Media**: Platforms like WhatsApp, Facebook, and Twitter recompress and strip metadata from images upon upload, destroying spatial LSB steganography and trailing container payloads.
2. **Out-of-Distribution Imagery**: Images created with non-standard camera sensors, AI generative models (Stable Diffusion, Midjourney), or aggressive stylistic filters may yield out-of-distribution noise patterns.
3. **Low-Capacity Adaptive Embeddings**: Advanced adaptive steganography with extremely low payload rates (< 0.05 bits per pixel) approaches the theoretical detection limits of both statistical and machine learning steganalysis.
4. **Keyed Encryption**: StegoLens detects the *presence* of steganographic perturbation; it does not decrypt payloads protected by strong cryptographic ciphers (e.g. AES-256).
