#!/usr/bin/env python3
"""
=============================================================================
TRANSIX - NUGEN AUTONOMOUS ALIGNMENT RUNNER & RECOVERY DAEMON
=============================================================================
Continuously monitors Nugen API cluster health, attempts alignment across
multiple base models, handles 502 Bad Gateway retries automatically, and
updates backend/.env with the final trained model_id upon completion.
=============================================================================
"""

import os
import sys
import time
import json
import requests
from pathlib import Path

# Paths
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent.parent
ENV_PATH = BACKEND_DIR / ".env"
METADATA_PATH = SCRIPT_DIR.parent / "nugen" / "alignment_metadata.json"

# Load environment
def load_env():
    env = {}
    if ENV_PATH.exists():
        with open(ENV_PATH, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env[k.strip()] = v.strip().strip("\"'")
    return env

env = load_env()
API_KEY = env.get("NUGEN_API_KEY", "nugen-76935b977ae7ad9c")
raw_base = env.get("NUGEN_BASE_URL", "https://api.nugen.in")
BASE_URL = raw_base if raw_base.endswith("/api/v3") else f"{raw_base}/api/v3"

DOC_ID = "document_01m3g38x5mp4kjjz"
BENCHMARK_ID = "benchmark_01m3g395551zqc8j"

CANDIDATE_MODELS = [
    "llama-v3p2-3b-reasoning",
    "qwen-v2p5-0p5b-instruct",
    "qwen2-vl-2b-instruct"
]

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

def update_env_file(model_id):
    """Write newly deployed model ID directly to backend/.env"""
    print(f"\n[Auto-Deploy] Updating {ENV_PATH} with NUGEN_MODEL_ID={model_id}...")
    lines = []
    found = False
    if ENV_PATH.exists():
        with open(ENV_PATH, "r") as f:
            for line in f:
                if line.startswith("NUGEN_MODEL_ID="):
                    lines.append(f"NUGEN_MODEL_ID={model_id}\n")
                    found = True
                else:
                    lines.append(line)
    if not found:
        lines.append(f"NUGEN_MODEL_ID={model_id}\n")
    
    with open(ENV_PATH, "w") as f:
        f.writelines(lines)
    print("✓ backend/.env successfully updated!")

def create_alignment_project(base_model_id):
    payload = {
        "alignment_name": f"transix-{base_model_id.replace('.', 'p')[:20]}",
        "base_model_id": base_model_id,
        "document_ids": [DOC_ID],
        "benchmark_ids": [BENCHMARK_ID]
    }
    try:
        res = requests.post(f"{BASE_URL}/alignment-projects/create", headers=HEADERS, json=payload, timeout=20)
        return res.status_code, res.json()
    except Exception as e:
        return 500, {"error": str(e)}

def poll_project(alignment_id):
    try:
        res = requests.get(f"{BASE_URL}/alignment-projects/{alignment_id}", headers=HEADERS, timeout=15)
        if res.status_code == 200:
            return res.json()
    except Exception as e:
        print(f"  [Poll Warning] Network error: {e}")
    return None

def test_inference(model_id):
    """Run verification inference query against the new model"""
    print(f"\n[Verification] Testing live inference on {model_id}...")
    test_payload = {
        "model": model_id,
        "messages": [
            {"role": "system", "content": "You are Transix Travel Intelligence."},
            {"role": "user", "content": "Provide a 1-day itinerary for Manali."}
        ],
        "temperature": 0.3
    }
    try:
        res = requests.post(f"{BASE_URL}/inference/chat/completions", headers=HEADERS, json=test_payload, timeout=30)
        if res.status_code == 200:
            print("✓ Live Inference SUCCESSFUL!")
            print("Response preview:", res.json().get("choices", [{}])[0].get("message", {}).get("content", "")[:200])
            return True
        else:
            print(f"✗ Inference returned {res.status_code}: {res.text}")
    except Exception as e:
        print(f"✗ Inference failed: {e}")
    return False

def run_loop():
    print("=" * 65)
    print("TRANSIX - NUGEN AUTONOMOUS ALIGNMENT RUNNER")
    print("=" * 65)
    print(f"API Key:       {API_KEY[:8]}...{API_KEY[-4:]}")
    print(f"Document ID:   {DOC_ID}")
    print(f"Benchmark ID:  {BENCHMARK_ID}")
    print(f"Target Models: {', '.join(CANDIDATE_MODELS)}")
    print("=" * 65)

    attempt = 0
    while True:
        attempt += 1
        print(f"\n[Cycle #{attempt}] Testing Nugen GPU Cluster Availability at {time.strftime('%H:%M:%S')}...")

        for model in CANDIDATE_MODELS:
            print(f"\n  → Attempting alignment with base model: '{model}'...")
            status_code, resp = create_alignment_project(model)

            if status_code == 200:
                alignment_id = resp.get("alignment_id")
                print(f"  ✓ Project registered! ID: {alignment_id}. Polling execution...")

                # Monitor this project
                for poll_count in range(12):  # Poll for up to 60 seconds to detect instant 502 vs real run
                    time.sleep(5)
                    data = poll_project(alignment_id)
                    if not data:
                        continue
                    
                    p_status = data.get("status")
                    p_err = data.get("error")
                    p_prog = data.get("progress", 0)
                    model_id = data.get("model_id")

                    print(f"    Status: {p_status} | Progress: {p_prog}% | Error: {p_err or 'None'}")

                    if p_status == "COMPLETED" or model_id:
                        print(f"\n🎉 TRAINING COMPLETED SUCCESSFULLY!")
                        print(f"Model ID: {model_id}")
                        update_env_file(model_id)
                        test_inference(model_id)
                        return

                    if p_status == "FAILED":
                        if "502 Bad Gateway" in str(p_err):
                            print(f"    ✗ Cluster returned 502 Bad Gateway for {model} (cluster GPU queue busy).")
                        else:
                            print(f"    ✗ Project failed: {p_err}")
                        break

                    if p_status in ["PROCESSING", "RUNNING", "TRAINING"]:
                        print(f"    🚀 GPU Finetuning IN PROGRESS! Waiting 30s...")
                        time.sleep(30)
            else:
                print(f"  ✗ Project creation rejected ({status_code}): {resp}")

        # Sleep before next cycle
        wait_seconds = 45
        print(f"\n[Info] Cluster currently overloaded by hackathon traffic.")
        print(f"[Daemon] Retrying automatically in {wait_seconds} seconds (Press Ctrl+C to stop)...")
        time.sleep(wait_seconds)

if __name__ == "__main__":
    try:
        run_loop()
    except KeyboardInterrupt:
        print("\n\nDaemon stopped by user. Transix continues running with graceful fallback.")
        sys.exit(0)
