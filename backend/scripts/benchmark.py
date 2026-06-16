#!/usr/bin/env python3
"""Run KAIROS benchmarks and print results."""
import json
import sys
sys.path.insert(0, "..")

from src.rocm.benchmark import run_benchmarks

if __name__ == "__main__":
    results = run_benchmarks()
    print(json.dumps(results, indent=2))
    print(f"\nDevice: {results['device']}")
    print(f"Benchmarks run: {results['summary']['total_benchmarks']}")
    print(f"Average latency: {results['summary']['avg_latency_all_ms']}ms")
