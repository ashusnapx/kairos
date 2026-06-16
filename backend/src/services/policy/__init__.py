from datetime import datetime

POLICIES = [
    {
        "name": "FATF Recommendations 2026",
        "version": "FATF_v2026_1",
        "effective_date": "2026-01-01",
        "content": """
FATF Recommendation 10: Customer due diligence required for all business relationships.
FATF Recommendation 11: Record-keeping of transaction data for at least 5 years.
FATF Recommendation 12: PEPs require enhanced due diligence.
FATF Recommendation 16: Beneficial ownership information must be obtained.
FATF Recommendation 20: Reporting of suspicious transactions.
        """,
    },
    {
        "name": "RBI KYC Master Direction",
        "version": "RBI_v2026_3",
        "effective_date": "2026-03-15",
        "content": """
RBI KYC Direction 2026: Aadhaar-based eKYC permitted for low-risk customers.
Section 4: Periodic updates required every 2 years for high-risk customers.
Section 7: Enhanced due diligence for non-face-to-face onboarding.
        """,
    },
    {
        "name": "OFAC Sanctions Program",
        "version": "OFAC_v2026_2",
        "effective_date": "2026-02-01",
        "content": "Prohibited transactions with sanctioned entities and individuals as designated by OFAC.",
    },
    {
        "name": "EU AML Package 2026",
        "version": "EU_AML_v2026_2",
        "effective_date": "2026-07-01",
        "content": """
EU AML Regulation: Beneficial ownership register access required.
EU AML Directive: Group-wide AML policies mandatory.
        """,
    },
]


def get_active_policies() -> list[dict]:
    return [p for p in POLICIES if p["effective_date"] <= datetime.now().isoformat()[:10]]


def get_policy_by_version(version: str) -> dict | None:
    for p in POLICIES:
        if p["version"] == version:
            return p
    return None
