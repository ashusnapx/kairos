import json
import structlog

from src.agents.base import BaseAgent
from src.core.constants import AgentStatus
from src.models.schemas import AgentOutput, Finding, Evidence, Counterfactual, FinancialProfile
from src.services.llm_client import llm_client

logger = structlog.get_logger()


def detect_anomalies(transactions: list[float]) -> list[dict]:
    if len(transactions) < 5:
        return [{"type": "INSUFFICIENT_DATA", "confidence": 0.5, "description": "Not enough transactions to profile"}]
    from sklearn.ensemble import IsolationForest
    import numpy as np
    model = IsolationForest(contamination=0.1, random_state=42)
    X = np.array(transactions).reshape(-1, 1)
    preds = model.fit_predict(X)
    scores = model.score_samples(X)

    anomalies = []
    for i, (pred, score) in enumerate(zip(preds, scores)):
        if pred == -1:
            severity = "HIGH" if abs(score) > 0.5 else "MEDIUM"
            anomalies.append({
                "type": "STRUCTURING",
                "index": i,
                "amount": float(transactions[i]),
                "severity": severity,
                "confidence": float(min(1.0, abs(score) * 2)),
            })
    return anomalies


def compute_risk_score(anomalies: list[dict], income: float, deposits: list[float]) -> float:
    base = 30.0
    for a in anomalies:
        base += a["confidence"] * 20
    if income > 0 and deposits:
        avg_deposit = sum(deposits) / len(deposits)
        if avg_deposit > income * 3:
            base += 15
    return min(100.0, base)


def generate_counterfactuals(anomalies: list[dict], income: float, current_risk: float) -> list[Counterfactual]:
    cfs = []
    if not anomalies and income > 0:
        cfs.append(Counterfactual(scenario="Income proof submitted", new_risk=max(10, current_risk - 30)))
    if income <= 0:
        cfs.append(Counterfactual(scenario="Verified income source documented", new_risk=max(15, current_risk - 25)))
    if anomalies:
        cfs.append(Counterfactual(scenario="Transaction pattern explained with supporting documents", new_risk=max(20, current_risk - 20)))
    cfs.append(Counterfactual(scenario="Additional collateral provided", new_risk=max(5, current_risk - 15)))
    return cfs


class FinancialProfilingAgent(BaseAgent):
    agent_name = "financial_profiling"

    async def run(self, case_id: str, payload: dict) -> AgentOutput:
        transactions = payload.get("transactions", [1000, 2000, 1500, 3000, 500, 10000, 2500, 1800])
        income = payload.get("income", 0.0)
        deposits = payload.get("deposits", [])

        findings = []
        evidence_list = []
        uncertainties = []

        anomalies = detect_anomalies(transactions)
        current_risk = compute_risk_score(anomalies, income, deposits or transactions)
        future_risk = max(0, current_risk - 5)

        for anom in anomalies:
            findings.append(Finding(
                finding_type=anom["type"],
                description=f"Anomalous transaction #{anom['index']}: ${anom['amount']:.2f} ({anom['severity']})",
                confidence=anom["confidence"],
                evidence=[Evidence(
                    source="Isolation Forest",
                    content=f"Transaction amount ${anom['amount']:.2f} flagged as anomalous",
                    confidence=anom["confidence"],
                )],
            ))
            evidence_list.append(Evidence(
                source="Anomaly Detection",
                content=json.dumps(anom),
                confidence=anom["confidence"],
            ))

        counterfactuals = generate_counterfactuals(anomalies, income, current_risk)

        try:
            llm_prompt = f"""Analyze this financial profile for KYC risk:
Risk score: {current_risk:.1f}/100
Transactions: {transactions[:10]}
Income: {income}
Anomalies: {len(anomalies)}
Counterfactuals: {[c.scenario for c in counterfactuals]}

Provide:
1. Key risk factors
2. Recommended mitigations
3. Confidence assessment

Return JSON:
{{"risk_factors": [], "mitigations": [], "confidence_assessment": ""}}"""
            llm_result = await llm_client.generate_json(llm_prompt, system="You are a financial crime investigator.")
            if llm_result and "error" not in llm_result:
                findings.append(Finding(
                    finding_type="PROFILE_ASSESSMENT",
                    description=f"Key risk factors: {llm_result.get('risk_factors', [])}",
                    confidence=0.7,
                    evidence=[Evidence(source="LLM Profile Analysis", content=str(llm_result), confidence=0.7)],
                ))
        except Exception as e:
            uncertainties.append(f"LLM profiling unavailable: {e}")

        recommendation = "PROCEED"
        status = AgentStatus.SUCCESS
        if current_risk > 60:
            recommendation = "REVIEW"
            status = AgentStatus.REVIEW
        if current_risk > 80:
            recommendation = "ESCALATE"
            status = AgentStatus.FAILURE
        if anomalies:
            high_sev = [a for a in anomalies if a.get("severity") == "HIGH"]
            if high_sev:
                recommendation = "ESCALATE"
                status = AgentStatus.FAILURE

        return AgentOutput(
            agent_name=self.agent_name,
            status=status,
            confidence=1.0 - (current_risk / 200),
            findings=findings,
            evidence=evidence_list,
            uncertainties=uncertainties,
            recommendation=recommendation,
        )
