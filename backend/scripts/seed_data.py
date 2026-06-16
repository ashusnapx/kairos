#!/usr/bin/env python3
"""Seed database with synthetic cases for demo."""
import asyncio
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.services.synthetic_data import generate_dataset
from src.orchestrator.workflow import run_case
from src.storage.postgres import init_db
from src.storage.neo4j import neo4j_client


async def seed(num_cases: int = 10):
    await init_db()
    try:
        await neo4j_client.connect()
    except Exception as e:
        print(f"Note: Neo4j unavailable ({e}), graph features disabled")
    cases = generate_dataset(num_cases)
    print(f"Seeding {len(cases)} cases...")

    for i, case_data in enumerate(cases):
        try:
            result = await run_case(case_data)
            case_id = result.get("case_id", "unknown")
            decision = result.get("debate_output", {}).get("recommendation", "unknown")
            print(f"  [{i+1}/{len(cases)}] {case_data['customer_name'][:20]:20s} → {decision:10s} (id={case_id[:8]})")
        except Exception as e:
            print(f"  [{i+1}/{len(cases)}] FAILED: {e}")

    print(f"\nSeeded {num_cases} cases successfully.")


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    asyncio.run(seed(n))
