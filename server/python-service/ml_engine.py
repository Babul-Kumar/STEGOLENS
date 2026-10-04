"""
StegoLens ML Inference Engine
Architecture: EfficientNet-B0 trained on ALASKA2 Steganalysis dataset
Model Artifacts: model/best_model.pth, model_config.json, normalization.json, class_mapping.json
"""

import sys
import os
import json
from pathlib import Path
from PIL import Image

def get_project_root():
    # File is in server/python-service/ml_engine.py -> root is two levels up
    return Path(__file__).resolve().parent.parent.parent

def load_configs(root: Path):
    model_dir = root / "model"
    config_path = model_dir / "model_config.json"
    norm_path = model_dir / "normalization.json"
    class_map_path = model_dir / "class_mapping.json"
    metrics_path = model_dir / "metrics.json"
    weights_path = model_dir / "best_model.pth"

    errors = []
    for p in [config_path, norm_path, class_map_path, weights_path]:
        if not p.is_file():
            errors.append(f"Missing required artifact: {p.name}")

    if errors:
        return None, errors

    with open(config_path, "r", encoding="utf-8") as f:
        model_config = json.load(f)
    with open(norm_path, "r", encoding="utf-8") as f:
        normalization = json.load(f)
    with open(class_map_path, "r", encoding="utf-8") as f:
        class_mapping = json.load(f)
    metrics = {}
    if metrics_path.is_file():
        with open(metrics_path, "r", encoding="utf-8") as f:
            metrics = json.load(f)

    return {
        "model_config": model_config,
        "normalization": normalization,
        "class_mapping": class_mapping,
        "metrics": metrics,
        "weights_path": str(weights_path),
    }, []

def check_health():
    root = get_project_root()
    configs, errors = load_configs(root)
    if errors:
        return {
            "status": "error",
            "available": False,
            "errors": errors,
        }

    try:
        import torch
        import timm
    except ImportError as e:
        return {
            "status": "error",
            "available": False,
            "errors": [f"Missing python dependency: {str(e)}"],
        }

    try:
        model = timm.create_model("efficientnet_b0", num_classes=1, pretrained=False)
        state_dict = torch.load(configs["weights_path"], map_location="cpu", weights_only=True)
        model.load_state_dict(state_dict)
        model.eval()

        return {
            "status": "ready",
            "available": True,
            "model": configs["model_config"].get("model", "efficientnet_b0"),
            "input_size": configs["model_config"].get("input_size", 512),
            "threshold": configs["model_config"].get("threshold", 0.22),
            "test_roc_auc": configs["metrics"].get("test", {}).get("roc_auc", 0.685),
            "weighted_auc": configs["metrics"].get("test", {}).get("weighted_auc", 0.767),
            "device": "cpu",
        }
    except Exception as e:
        return {
            "status": "error",
            "available": False,
            "errors": [f"Failed to instantiate model: {str(e)}"],
        }

def run_inference(image_path: str):
    root = get_project_root()
    configs, errors = load_configs(root)
    if errors:
        return {
            "status": "error",
            "error": "; ".join(errors),
        }

    try:
        import torch
        import torchvision.transforms as T
        import timm
    except ImportError as e:
        return {
            "status": "error",
            "error": f"ML dependencies unavailable: {str(e)}",
        }

    if not os.path.isfile(image_path):
        return {
            "status": "error",
            "error": f"Image file not found: {image_path}",
        }

    try:
        img = Image.open(image_path).convert("RGB")
        input_size = configs["model_config"].get("input_size", 512)
        mean = configs["normalization"].get("mean", [0.485, 0.456, 0.406])
        std = configs["normalization"].get("std", [0.229, 0.224, 0.225])
        threshold = float(configs["model_config"].get("threshold", 0.21999999999999997))

        # Training preprocessing: Resize to 512x512, ToTensor (scale 0-1), Normalize(mean, std)
        preprocess = T.Compose([
            T.Resize((input_size, input_size), interpolation=T.InterpolationMode.BILINEAR),
            T.ToTensor(),
            T.Normalize(mean=mean, std=std),
        ])

        tensor = preprocess(img).unsqueeze(0)  # Shape: (1, 3, 512, 512)

        model = timm.create_model("efficientnet_b0", num_classes=1, pretrained=False)
        state_dict = torch.load(configs["weights_path"], map_location="cpu", weights_only=True)
        model.load_state_dict(state_dict)
        model.eval()

        with torch.no_grad():
            logit = model(tensor)
            prob = torch.sigmoid(logit).item()

        # Class determination based on ALASKA2 calibrated threshold
        prediction = "stego" if prob >= threshold else "cover"

        # Confidence categorization
        dist_from_threshold = abs(prob - threshold)
        if dist_from_threshold > 0.4:
            confidence = "high"
        elif dist_from_threshold > 0.15:
            confidence = "medium"
        else:
            confidence = "low"

        description = (
            f"ML model estimates a {prob * 100:.1f}% probability of steganographic embedding "
            f"(calibrated threshold: {threshold:.2f})."
        )

        return {
            "status": "ready",
            "prediction": prediction,
            "probability": round(prob, 4),
            "confidence": confidence,
            "modelVersion": "ALASKA2 EfficientNet-B0 (v1.0)",
            "threshold": threshold,
            "description": description,
            "metrics": {
                "test_roc_auc": configs["metrics"].get("test", {}).get("roc_auc", 0.685),
                "weighted_auc": configs["metrics"].get("test", {}).get("weighted_auc", 0.767),
            },
        }

    except Exception as e:
        return {
            "status": "error",
            "error": f"ML inference failed: {str(e)}",
        }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "error": "Missing argument (--health or <image_path>)"}))
        sys.exit(1)

    arg = sys.argv[1]
    if arg == "--health":
        result = check_health()
    else:
        result = run_inference(arg)

    print(json.dumps(result))

if __name__ == "__main__":
    main()
