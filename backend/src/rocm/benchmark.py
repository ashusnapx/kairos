#!/usr/bin/env python3
"""ROCm optimization benchmarks for KAIROS.

Measures inference latency across CPU, non-optimized, and ROCm paths.
"""
import time
import json
import structlog
from typing import Callable, Any

logger = structlog.get_logger()


def benchmark_inference(
    name: str,
    fn: Callable,
    inputs: list[Any],
    warmup: int = 3,
    runs: int = 10,
) -> dict:
    results = []
    for _ in range(warmup):
        for inp in inputs:
            fn(inp)

    for _ in range(runs):
        for inp in inputs:
            start = time.monotonic()
            fn(inp)
            elapsed = (time.monotonic() - start) * 1000
            results.append(elapsed)

    avg = sum(results) / len(results)
    return {
        "benchmark": name,
        "avg_latency_ms": round(avg, 2),
        "min_latency_ms": round(min(results), 2),
        "max_latency_ms": round(max(results), 2),
        "total_runs": len(results),
        "throughput_items_per_sec": round(1000 / avg * len(inputs), 2) if avg > 0 else 0,
    }


def detect_rocm() -> bool:
    try:
        import torch
        if torch.cuda.is_available():
            props = torch.cuda.get_device_properties(0)
            logger.info("cuda_device_detected", name=props.name, memory_gb=props.total_memory / 1e9)
            return True
        logger.warning("no_cuda_device_found")
        return False
    except Exception as e:
        logger.error("rocm_detection_failed", error=str(e))
        return False


def benchmark_models():
    results = []
    has_gpu = detect_rocm()

    if has_gpu:
        import torch
        device = torch.device("cuda")
        sizes = [(128, 128), (256, 256), (512, 512)]
        for h, w in sizes:
            mat_a = torch.randn(h, w, device=device)
            mat_b = torch.randn(w, h, device=device)

            def matmul(a=mat_a, b=mat_b):
                return (a @ b).sum().item()

            result = benchmark_inference(
                f"Matrix Multiply ({h}x{w})",
                matmul,
                [mat_a for _ in range(5)],
                warmup=5,
                runs=20,
            )
            results.append(result)

        embedding_dim = 384
        batch_sizes = [1, 8, 32, 64]
        for bs in batch_sizes:
            emb = torch.randn(bs, embedding_dim, device=device)

            def cosine_sim(e=emb):
                return (e @ e.T).mean().item()

            result = benchmark_inference(
                f"Embedding Similarity (batch={bs})",
                cosine_sim,
                [emb for _ in range(5)],
                warmup=3,
                runs=10,
            )
            results.append(result)
    else:
        logger.warning("no_gpu_available_benchmarking_cpu")
        import numpy as np
        sizes = [(128, 128), (256, 256)]
        for h, w in sizes:
            mat_a = np.random.randn(h, w)
            mat_b = np.random.randn(w, h)

            def np_matmul(a=mat_a, b=mat_b):
                return (a @ b).sum().item()

            result = benchmark_inference(
                f"NumPy Matrix Multiply ({h}x{w}) - CPU",
                np_matmul,
                [mat_a for _ in range(3)],
                warmup=2,
                runs=5,
            )
            results.append(result)

    return {
        "device": "rocm" if has_gpu else "cpu",
        "benchmarks": results,
        "summary": {
            "total_benchmarks": len(results),
            "avg_latency_all_ms": round(sum(r["avg_latency_ms"] for r in results) / len(results), 2) if results else 0,
        },
    }


def run_benchmarks() -> dict:
    logger.info("starting_kairos_benchmarks")
    results = benchmark_models()
    logger.info("benchmarks_complete", device=results["device"], benchmarks=len(results["benchmarks"]))
    return results


if __name__ == "__main__":
    result = run_benchmarks()
    print(json.dumps(result, indent=2))
