import json
import random
import uuid
from datetime import datetime, timedelta

from faker import Faker

fake = Faker()
random.seed(42)
fake.seed_instance(42)


CUSTOMER_TYPES = ["LOW_RISK", "MEDIUM_RISK", "PEP", "FRAUD_RING", "MULE", "TAMPERED_DOC"]
DOCUMENT_TYPES = ["PASSPORT", "AADHAAR", "DRIVING_LICENSE", "UTILITY_BILL", "PAN_CARD", "BANK_STATEMENT", "TAX_DOCUMENT"]
ANOMALIES = ["STRUCTURING", "LAYERING", "VELOCITY", "INCOME_MISMATCH", "ROUND_TRIPPING"]
GRAPH_PATTERNS = ["FRAUD_RING", "SHELL_ENTITY", "SHARED_ADDRESS", "SHARED_DEVICE", "CIRCULAR_TRANSACTION"]


def generate_case(customer_type: str | None = None) -> dict:
    ctype = customer_type or random.choice(CUSTOMER_TYPES)
    is_risky = ctype in ("PEP", "FRAUD_RING", "MULE", "TAMPERED_DOC")

    name = fake.name()
    address = fake.address()
    income = random.randint(30000, 200000) if not is_risky else random.randint(5000, 50000)

    num_tx = random.randint(8, 25)
    base_amount = income / 12 if income > 0 else 3000

    if ctype == "MULE":
        transactions = [random.randint(5000, 15000) for _ in range(num_tx)]
    elif ctype == "FRAUD_RING":
        transactions = [random.randint(100, 500) for _ in range(num_tx // 2)] + [random.randint(9000, 10000) for _ in range(num_tx // 2)]
    elif ctype == "STRUCTURING":
        transactions = [random.randint(8000, 9500) for _ in range(num_tx)]
    else:
        transactions = [max(10, int(random.gauss(base_amount, base_amount * 0.3))) for _ in range(num_tx)]

    tampering = None
    if ctype == "TAMPERED_DOC":
        tampering = {
            "tampering_detected": True,
            "tampering_type": random.choice(["EXPIRY_DATE_MODIFICATION", "SIGNATURE_FORGERY", "ADDRESS_ALTERATION"]),
            "confidence": random.uniform(0.7, 0.98),
            "evidence": ["ELA anomaly near expiry field", "Font mismatch detected", "Metadata inconsistency"],
        }

    graph_pattern = None
    if ctype in ("FRAUD_RING", "MULE"):
        graph_pattern = {
            "suspicious_pattern": random.choice(GRAPH_PATTERNS),
            "entities_involved": random.randint(3, 10),
            "confidence": random.uniform(0.75, 0.95),
        }

    pep_match = None
    regulation = None
    if ctype == "PEP":
        pep_match = {
            "finding_type": "PEP_MATCH",
            "confidence": random.uniform(0.8, 0.99),
            "regulation": "FATF Recommendation 12",
            "recommended_action": "EDD_REQUIRED",
        }
        regulation = "FATF_v2026_1"

    anomalies = []
    if ctype == "STRUCTURING":
        anomalies.append({
            "type": "STRUCTURING",
            "confidence": random.uniform(0.7, 0.95),
            "description": "Multiple deposits just below reporting threshold",
        })
    elif ctype == "MULE":
        anomalies.append({
            "type": "VELOCITY",
            "confidence": random.uniform(0.7, 0.9),
            "description": "High transaction velocity inconsistent with profile",
        })

    current_risk = {
        "LOW_RISK": random.randint(10, 30),
        "MEDIUM_RISK": random.randint(30, 55),
        "PEP": random.randint(60, 85),
        "FRAUD_RING": random.randint(70, 95),
        "MULE": random.randint(65, 90),
        "TAMPERED_DOC": random.randint(50, 80),
    }[ctype]

    return {
        "customer_name": name,
        "customer_id": f"CUST-{uuid.uuid4().hex[:8].upper()}",
        "address": address,
        "income": income,
        "transactions": transactions,
        "deposits": [t for t in transactions if t > 0],
        "documents": random.sample(DOCUMENT_TYPES, random.randint(1, 3)),
        "customer_type": ctype,
        "expected_risk": current_risk,
        "tampering": tampering,
        "graph_pattern": graph_pattern,
        "pep_match": pep_match,
        "regulation": regulation,
        "anomalies": anomalies,
    }


def generate_dataset(size: int = 100) -> list[dict]:
    type_distribution = {
        "LOW_RISK": int(size * 0.4),
        "MEDIUM_RISK": int(size * 0.25),
        "PEP": int(size * 0.12),
        "FRAUD_RING": int(size * 0.08),
        "MULE": int(size * 0.08),
        "TAMPERED_DOC": int(size * 0.07),
    }
    cases = []
    for ctype, count in type_distribution.items():
        for _ in range(count):
            cases.append(generate_case(ctype))
    random.shuffle(cases)
    return cases[:size]
