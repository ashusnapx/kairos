from neo4j import AsyncGraphDatabase, AsyncDriver

from src.config import settings


class Neo4jClient:
    def __init__(self):
        self.driver: AsyncDriver | None = None

    async def connect(self):
        if self.driver is not None:
            return
        self.driver = AsyncGraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )
        await self.driver.verify_connectivity()

    async def ensure_connected(self):
        if self.driver is None:
            await self.connect()

    async def close(self):
        if self.driver:
            await self.driver.close()

    async def run_query(self, query: str, params: dict | None = None):
        await self.ensure_connected()
        async with self.driver.session() as session:
            result = await session.run(query, params or {})
            return await result.data()

    async def create_entity(self, labels: list[str], properties: dict):
        labels_str = ":".join(labels)
        query = f"""
        MERGE (n:{labels_str} {{id: $id}})
        SET n += $properties
        RETURN n
        """
        return await self.run_query(query, {"id": properties["id"], "properties": properties})

    async def create_relationship(self, from_id: str, rel_type: str, to_id: str, properties: dict | None = None):
        query = f"""
        MATCH (a {{id: $from_id}})
        MATCH (b {{id: $to_id}})
        MERGE (a)-[r:{rel_type}]->(b)
        SET r += $properties
        RETURN r
        """
        return await self.run_query(query, {
            "from_id": from_id,
            "to_id": to_id,
            "properties": properties or {},
        })

    async def find_paths(self, entity_id: str, max_depth: int = 3):
        query = """
        MATCH path = (start {id: $id})-[*1..$max_depth]-(connected)
        RETURN path
        LIMIT 100
        """
        return await self.run_query(query, {"id": entity_id, "max_depth": max_depth})

    async def detect_fraud_rings(self):
        query = """
        MATCH (p1:Person)-[:SHARES_ADDRESS|SHARES_DEVICE]-(p2:Person)
        WITH p1, p2
        MATCH (p2)-[:SHARES_ADDRESS|SHARES_DEVICE]-(p3:Person)
        WHERE p1 <> p3 AND NOT (p1)-[:SHARES_ADDRESS|SHARES_DEVICE]-(p3)
        RETURN p1.id AS suspect_a, p2.id AS hub, p3.id AS suspect_b
        LIMIT 50
        """
        return await self.run_query(query)


neo4j_client = Neo4jClient()
