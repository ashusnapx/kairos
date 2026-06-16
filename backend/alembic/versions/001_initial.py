"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-06-16
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "cases",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("status", sa.String(32), nullable=False, default="PENDING", index=True),
        sa.Column("customer_name", sa.String(255), nullable=False),
        sa.Column("customer_id", sa.String(255), default=""),
        sa.Column("risk_score", sa.Float, default=0.0),
        sa.Column("decision", sa.String(32), nullable=True),
        sa.Column("decision_confidence", sa.Float, default=0.0),
        sa.Column("stability_score", sa.Float, default=0.0),
        sa.Column("trace_id", sa.String(64), default=""),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "documents",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("case_id", UUID(as_uuid=False), sa.ForeignKey("cases.id"), nullable=False),
        sa.Column("doc_type", sa.String(32), nullable=False),
        sa.Column("file_path", sa.String(512), nullable=False),
        sa.Column("extracted_data", JSON, nullable=True),
        sa.Column("tampering_result", JSON, nullable=True),
        sa.Column("ocr_confidence", sa.Float, default=0.0),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "agent_results",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("case_id", UUID(as_uuid=False), sa.ForeignKey("cases.id"), nullable=False),
        sa.Column("agent_name", sa.String(64), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("confidence", sa.Float, default=0.0),
        sa.Column("findings", JSON, default=dict),
        sa.Column("evidence", JSON, default=dict),
        sa.Column("uncertainties", JSON, default=list),
        sa.Column("recommendation", sa.String(64), default=""),
        sa.Column("execution_time_ms", sa.Integer, default=0),
        sa.Column("trace_id", sa.String(64), default=""),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "debates",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("case_id", UUID(as_uuid=False), sa.ForeignKey("cases.id"), nullable=False),
        sa.Column("transcript", JSON, default=dict),
        sa.Column("consensus", sa.String(32), default=""),
        sa.Column("consensus_confidence", sa.Float, default=0.0),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "human_reviews",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("case_id", UUID(as_uuid=False), sa.ForeignKey("cases.id"), nullable=False),
        sa.Column("reviewer_id", sa.String(128), nullable=False),
        sa.Column("action", sa.String(32), nullable=False),
        sa.Column("reasoning", sa.Text, default=""),
        sa.Column("notes", sa.Text, default=""),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("case_id", UUID(as_uuid=False), sa.ForeignKey("cases.id"), nullable=True),
        sa.Column("event_type", sa.String(64), nullable=False, index=True),
        sa.Column("payload", JSON, default=dict),
        sa.Column("trace_id", sa.String(64), default=""),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "policies",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("version", sa.String(64), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("effective_date", sa.DateTime, nullable=False),
        sa.Column("status", sa.String(32), default="ACTIVE"),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "learning_insights",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("insight", sa.Text, nullable=False),
        sa.Column("confidence", sa.Float, default=0.0),
        sa.Column("recommendation", sa.Text, default=""),
        sa.Column("evidence", JSON, default=dict),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )


def downgrade() -> None:
    op.drop_table("learning_insights")
    op.drop_table("policies")
    op.drop_table("audit_logs")
    op.drop_table("human_reviews")
    op.drop_table("debates")
    op.drop_table("agent_results")
    op.drop_table("documents")
    op.drop_table("cases")
