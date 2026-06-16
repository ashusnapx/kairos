import json
import structlog

from src.agents.base import BaseAgent
from src.core.constants import AgentStatus
from src.models.schemas import AgentOutput, Finding, Evidence, GraphFinding
from src.storage.neo4j import neo4j_client

logger = structlog.get_logger()


async def seed_demo_graph(case_id: str, customer_name: str, address: str):
    """Seed demo graph data for visualization."""
    queries = [
        {
            "q": """
            MERGE (p:Person {id: $case_id})
            SET p.name = $customer_name, p.type = 'CUSTOMER'
            WITH p
            MERGE (a:Address {id: $addr_id})
            SET a.full_address = $address
            MERGE (p)-[:RESIDES_AT]->(a)
            """,
            "params": {"addr_id": f"addr_{case_id}"},
        },
        {
            "q": """
            MERGE (a:Address {id: $addr_id})
            MERGE (s:Company {id: $shell_id})
            SET s.name = 'Offshore Services Ltd', s.type = 'SHELL_ENTITY'
            MERGE (a)<-[:REGISTERED_AT]-(s)
            """,
            "params": {"addr_id": f"addr_{case_id}", "shell_id": f"shell_{case_id}"},
        },
        {
            "q": """
            MERGE (p:Person {id: $case_id})
            MERGE (d:Device {id: $dev_id})
            SET d.device_id = $imei
            MERGE (p)-[:USES]->(d)
            """,
            "params": {"dev_id": f"dev_{case_id}", "imei": f"IMEI-{case_id[:8]}"},
        },
        {
            "q": """
            MERGE (p:Person {id: $case_id})
            MERGE (ac:Account {id: $acct_id})
            SET ac.account_number = $acct_num
            MERGE (p)-[:OWNS]->(ac)
            """,
            "params": {"acct_id": f"acct_{case_id}", "acct_num": f"XXXX{case_id[:8]}"},
        },
        {
            "q": """
            MATCH (a:Address {id: $addr_id})
            OPTIONAL MATCH (a)<-[:RESIDES_AT]-(other:Person)
            WHERE other.id <> $case_id
            WITH a, COLLECT(other) AS others
            UNWIND (CASE WHEN others = [] THEN [NULL] ELSE others END) AS other_person
            FOREACH (_ IN CASE WHEN other_person IS NOT NULL THEN [1] ELSE [] END |
                MERGE (a)<-[:RESIDES_AT]-(other_person)
            )
            """,
            "params": {"addr_id": f"addr_{case_id}"},
        },
    ]
    for item in queries:
        try:
            params = {"case_id": case_id, "customer_name": customer_name, "address": address}
            params.update(item["params"])
            await neo4j_client.run_query(item["q"], params)
        except Exception as e:
            logger.warning("graph_seed_query_failed", error=str(e))


class GraphIntelligenceAgent(BaseAgent):
    agent_name = "graph_intelligence"

    async def run(self, case_id: str, payload: dict) -> AgentOutput:
        customer_name = payload.get("customer_name", "Unknown")
        address = payload.get("address", "Unknown Address")

        findings = []
        evidence_list = []
        uncertainties = []

        await seed_demo_graph(case_id, customer_name, address)

        try:
            paths = await neo4j_client.find_paths(case_id, max_depth=3)
            if paths:
                evidence_list.append(Evidence(
                    source="Neo4j Graph",
                    content=f"Found {len(paths)} graph connections for this entity",
                    confidence=0.9,
                ))
        except Exception as e:
            uncertainties.append(f"Graph path analysis unavailable: {e}")

        try:
            rings = await neo4j_client.detect_fraud_rings()
            if rings:
                findings.append(Finding(
                    finding_type="FRAUD_RING_DETECTED",
                    description=f"Address linked to {len(rings)} potential fraud ring participants",
                    confidence=0.85,
                    evidence=[Evidence(
                        source="Graph Pattern Analysis",
                        content=f"Shared address pattern detected: {rings[:3]}",
                        confidence=0.85,
                    )],
                ))
                evidence_list.append(Evidence(
                    source="Fraud Ring Detection",
                    content=f"Detected {len(rings)} entities sharing address with this customer",
                    confidence=0.85,
                ))
        except Exception as e:
            uncertainties.append(f"Fraud ring detection unavailable: {e}")

        try:
            shell_query = """
            MATCH (p:Person)-[:RESIDES_AT]->(a:Address)<-[:REGISTERED_AT]-(s:Company)
            WHERE p.id = $case_id AND s.name = 'Offshore Services Ltd'
            RETURN s.name AS shell_entity, a.full_address AS address
            """
            shell_result = await neo4j_client.run_query(shell_query, {"case_id": case_id})
            if shell_result:
                for row in shell_result:
                    findings.append(Finding(
                        finding_type="SHELL_ENTITY_LINK",
                        description=f"Address linked to shell entity: {row.get('shell_entity', 'unknown')}",
                        confidence=0.88,
                        evidence=[Evidence(
                            source="Address Resolution",
                            content=f"Customer address overlaps with registered address of {row.get('shell_entity', 'unknown')}",
                            confidence=0.88,
                        )],
                    ))
        except Exception as e:
            uncertainties.append(f"Shell entity check unavailable: {e}")

        recommendation = "PROCEED"
        status = AgentStatus.SUCCESS
        has_shell = any(f.finding_type == "SHELL_ENTITY_LINK" for f in findings)
        has_fraud_ring = any(f.finding_type == "FRAUD_RING_DETECTED" for f in findings)

        if has_shell:
            recommendation = "ESCALATE"
            status = AgentStatus.FAILURE
        elif has_fraud_ring:
            recommendation = "REVIEW"
            status = AgentStatus.REVIEW

        overall_confidence = 0.9
        if has_shell:
            overall_confidence = 0.88
        elif has_fraud_ring:
            overall_confidence = 0.85
        elif uncertainties:
            overall_confidence = 0.6

        return AgentOutput(
            agent_name=self.agent_name,
            status=status,
            confidence=overall_confidence,
            findings=findings,
            evidence=evidence_list,
            uncertainties=uncertainties,
            recommendation=recommendation,
        )
