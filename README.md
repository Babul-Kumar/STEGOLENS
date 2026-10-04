# StegoLens: "Detect What Images Hide"

[![Build & Test](https://github.com/Babul-Kumar/Steganography-/actions/workflows/ci.yml/badge.svg)](https://github.com/Babul-Kumar/Steganography-/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.14-blue.svg)](https://python.org)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.14%20(CPU)-orange.svg)](https://pytorch.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

StegoLens is a high-assurance, production-grade digital image steganalysis and forensic inspection platform. It systematically combines **deterministic structural container analysis**, **pixel-intensity statistical moments**, **Least-Significant-Bit (LSB) distribution tests**, and a **deep neural steganalysis classifier (ALASKA2 EfficientNet-B0)** into an explainable, tamper-evident forensic assessment.

---

## Architecture Overview

```
                      +---------------------------------------+
                      |   Client: Vite + React 18 + Tailwind  |
                      |   Modern Technical Analytics Console  |
                      +-------------------+-------------------+
                                          |
                              HTTP / REST Multipart
                                          |
                      +-------------------v-------------------+
                      |   Node.js / Express Security Boundary |
                      | - 15 MB Centralized Limits            |
                      | - Magic Byte & MIME Validation        |
                      | - Pillow Image Decoding & Bombs Guard |
                      | - Strict Rate Limiting & CORS         |
                      | - Ephemeral Disk Storage & Cleanup    |
                      +---------+-------------------+---------+
                                |                   |
             Deterministic Call |                   | Neural Inference Call
                                |                   |
        +-----------------------v---+           +---v-----------------------+
        |  Python Vectorized NumPy  |           | PyTorch / timm ML Engine  |
        | - Pixel Intensity Entropy |           | - ALASKA2 EfficientNet-B0 |
        | - Channel Moments & Hist  |           | - 512x512 RGB Tensor      |
        | - PoV Chi-Square (k=127)  |           | - Sigmoid Logit Output    |
        | - Bit-Plane Decomposition |           | - Calibrated Threshold    |
        | - EXIF Metadata Parsing   |           | - Honest Benchmark AUC    |
        +-----------------------+---+           +---+-----------------------+
                                |                   |
                                +---------+---------+
                                          |
                      +-------------------v-------------------+
                      |   Evidence Synthesis & Persistence    |
                      | - Heuristic Suspicion Scoring (0-100) |
                      | - Explainable Overall Assessment      |
                      | - SQLite Audit Trail (stegoguard.db)  |
                      | - Vector PDF Forensic Report Engine   |
                      +---------------------------------------+
```

---

## Core Capabilities & Forensic Methodology

### 1. Deterministic Structural & Container Analysis
- **Container Delimiter Validation:** Sequential marker/chunk walker for JPEG (`SOI`, `DQT`, `SOF`, `DHT`, `SOS`, `EOI`), PNG (`IHDR`, `PLTE`, `IDAT`, `IEND`), WEBP (RIFF header chunks), BMP, and TIFF.
- **Trailing Data Detection:** Accurately isolates any unexpected byte payload injected beyond the legitimate end-of-file container marker (`EOI` / `IEND`).
- **Payload Signature Scanners:** Scans file streams and trailing byte regions for recognizable archive and binary executable signatures (`PK\x03\x04` for ZIP, `\x1F\x8B` for GZIP, `%PDF`, `Rar!`, `7z`, `MZ`, and `\x7FELF`).
- **Location Classification:** Distinguishes high-confidence `SIGNATURE_IN_TRAILING_DATA` from potential incidental compression noise (`SIGNATURE_IN_IMAGE_STREAM`).

### 2. Spatial & Statistical Steganalysis
- **Pixel Intensity Entropy:** Measures Shannon information entropy ($0.0 - 8.0$) across image channels:
  $$H(X) = -\sum_{i=0}^{255} P(x_i) \log_2 P(x_i)$$
- **Pairs-of-Values (PoV) Chi-Square Test:** Evaluates frequency flattening across adjacent intensity pairs $(2k, 2k+1)$ characteristic of sequential LSB substitution:
  $$\chi^2 = \sum_{k=0}^{127} \frac{(n_{2k} - n^*_{2k})^2}{n^*_{2k}}, \quad n^*_{2k} = \frac{n_{2k} + n_{2k+1}}{2}$$
- **Bit-Plane Decomposition:** Extracts bit-plane 0 (carrier noise) through bit-plane 7 (visual structure) with live Base64 PNG visualizations.
- **256-Bin Color Histograms:** Full distribution arrays for Red, Green, Blue, and Grayscale channels.

### 3. Machine Learning Steganalysis (ALASKA2 EfficientNet-B0)
- **Model Architecture:** EfficientNet-B0 backbone adapted with single logit output trained on the competitive ALASKA2 Steganalysis benchmark.
- **Trained Steganographic Algorithms:** JMiPOD, JUNIWARD, and UERD spatial/frequency domain embedding.
- **Exact Preprocessing:** 512×512 Bilinear RGB resize, $[0, 1]$ tensor scaling, ImageNet mean $[0.485, 0.456, 0.406]$ and std $[0.229, 0.224, 0.225]$.
- **Calibrated Decision Threshold:** Threshold calibrated at $0.22$ based on validation ROC curves to maximize true-positive discovery.
- **Benchmark Metrics:** Test ROC-AUC: `0.685`, Weighted AUC: `0.767` (recorded in `model/metrics.json`; no exaggerated or artificial metrics).

---

## Evidence Aggregation & Risk Scoring

StegoLens strictly separates **deterministic forensic evidence** from **neural ML probability**:

| Metric | Origin | Role |
| :--- | :--- | :--- |
| **Forensic Score (0–100)** | Deterministic parsers, trailing bytes, payload signatures, $\chi^2$ test, LSB ratio | Objective evidence of container manipulation or statistical bit flattening. |
| **ML Probability (0–100%)** | EfficientNet-B0 forward pass | Probability estimate of subtle embedding artifact presence. |
| **Overall Assessment** | Aggregation synthesis | Contextual narrative explaining concordance or divergence between signals. |

### Canonical Suspicion Thresholds
- **0 – 24:** `LOW` (Content consistent with normal, unmodified image carrier)
- **25 – 49:** `MODERATE` (Minor statistical deviations; no overt structural anomalies)
- **50 – 74:** `HIGH` (Statistical bit irregularities or elevated ML confidence)
- **75 – 100:** `VERY_HIGH` (Confirmed container trailing data or embedded payload signatures)

---

## Security Hardening & Defenses

- **15 MB File Upload Limit:** Enforced at both Multer streaming boundary and post-reception inspection.
- **Decompression Bomb Protection:** Limits max pixel dimension to 8,192 px and total pixel count to 50,000,000 pixels.
- **Magic-Byte Signature Verification:** Validates leading bytes against canonical format tables before invoking decoders.
- **Path Traversal Defense:** Sanitizes all original filenames; temporary files stored as random UUIDs (`${uuid}.tmp`).
- **Ephemeral Lifecycle:** Unconditionally unlinks temporary files in `finally` blocks, ensuring 0 orphaned files in `uploads/`.
- **Hardened HTTP Headers:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`.
- **IP Rate Limiting:** In-memory sliding window rate limiter prevents resource exhaustion attacks.

---

## Getting Started

### Prerequisites
- **Node.js:** v18.0+ or v20.0+ LTS
- **Python:** v3.11+ or v3.14 with `pip`

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Babul-Kumar/Steganography-.git
cd Steganography-

# Install Node dependencies
npm install

# Install Python dependencies
python -m pip install torch torchvision timm pillow numpy exifread
```

### 2. Environment Configuration
Copy the template environment file:
```bash
cp .env.example .env
```

### 3. Run Automated Test Suite
```bash
# Runs Phase D upload security and Phase E/F forensic and ML tests (89 passing tests)
npm test

# Run TypeScript static type check
npm run check

# Run production bundle build
npm run build
```

### 4. Start Development Server
```bash
npm run dev
# Server listening on http://localhost:5000
```

---

## API Reference

### Forensic Analysis
`POST /api/analyze`
- **Request:** `multipart/form-data` with field `image`
- **Response:** Canonical `AnalysisResult` JSON object containing `file`, `metadata`, `statistics`, `lsb`, `fileStructure`, `payloadDetection`, `visualizations`, `ml`, and `risk`.

### Analysis History
`GET /api/analyses?limit=20&offset=0`
- **Response:** List of persisted analysis summaries stored in SQLite database.

### Retrieve Analysis by ID
`GET /api/analyses/:id`
- **Response:** Full canonical analysis record.

### Delete Analysis
`DELETE /api/analyses/:id`
- **Response:** `{ "success": true }`

### Forensic Report Export
`GET /api/analyses/:id/report?format=pdf`
- **Response:** Publication-grade PDF report download (`application/pdf`).
`GET /api/analyses/:id/report?format=json`
- **Response:** Raw JSON analysis report download (`application/json`).

### Health Telemetry
`GET /api/health`
- **Response:** Health status for SQLite database, forensic engine, and ML model availability.

---

## Docker Deployment

Build and run using the optimized multi-stage Dockerfile:

```bash
docker build -t stegolens:latest .
docker run -p 5000:5000 stegolens:latest
```

---

## Academic Disclaimer & Responsible Disclosure

StegoLens is engineered for legitimate cybersecurity auditing, academic research, and digital forensic examination.

> [!NOTE]
> Steganalysis models detect statistical patterns and structural deviations. Unless a cryptographic or plaintext payload has been extracted and validated, detection outputs indicate **statistical suspicion**, not mathematical proof of malicious intent.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
