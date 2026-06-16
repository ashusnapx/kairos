import io
import structlog
from PIL import Image, ImageChops

from src.agents.base import BaseAgent
from src.core.constants import AgentStatus, DocumentType
from src.models.schemas import AgentOutput, Finding, Evidence, TamperingResult

logger = structlog.get_logger()


def detect_ela_artifacts(image_bytes: bytes) -> dict:
    """Error Level Analysis to detect image tampering."""
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img.save("/tmp/ela_original.jpg", "JPEG", quality=90)
        resaved = Image.open("/tmp/ela_original.jpg")

        ela_img = ImageChops.difference(img, resaved)
        extrema = ela_img.getextrema()
        max_diff = max([ext[1] for ext in extrema] if isinstance(extrema, list) else [extrema[1]])

        suspicious_regions = []
        if max_diff > 30:
            suspicious_regions.append("High ELA variance detected")
        if max_diff > 50:
            suspicious_regions.append("Severe compression inconsistency")

        return {
            "max_ela_difference": max_diff,
            "suspicious_regions": suspicious_regions,
            "tampering_likely": max_diff > 40,
        }
    except Exception as e:
        logger.error("ela_analysis_failed", error=str(e))
        return {"max_ela_difference": 0, "suspicious_regions": [], "tampering_likely": False}


def extract_fields_with_ocr(image_bytes: bytes, doc_type: str) -> dict:
    """Extract document fields. Uses mock extraction for demo; PaddleOCR in production."""
    fields = {
        "full_name": "",
        "date_of_birth": "",
        "address": "",
        "id_number": "",
        "issuing_authority": "",
        "expiry_date": "",
        "document_type": doc_type,
    }

    try:
        import importlib
        if importlib.util.find_spec("paddleocr"):
            from paddleocr import PaddleOCR
            ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
            img = Image.open(io.BytesIO(image_bytes))
            img.save("/tmp/ocr_input.png")
            result = ocr.ocr("/tmp/ocr_input.png", cls=True)
            if result and result[0]:
                text = " ".join([line[1][0] for line in result[0] if line and len(line) > 1])
                fields["full_name"] = text[:100] if text else ""
    except ImportError:
        logger.info("paddleocr_not_installed_using_metadata_fallback")
        img = Image.open(io.BytesIO(image_bytes))
        fields["full_name"] = f"Extracted from {doc_type} metadata"
        fields["image_size"] = f"{img.size[0]}x{img.size[1]}"

    return fields


def check_text_tampering(extracted: dict) -> list[str]:
    evidences = []
    if extracted.get("expiry_date", "").strip():
        import re
        dates = re.findall(r"\d{2}[/-]\d{2}[/-]\d{4}", extracted["expiry_date"])
        if dates:
            from datetime import datetime
            try:
                parsed = datetime.strptime(dates[0].replace("-", "/"), "%d/%m/%Y")
                if parsed < datetime(2024, 1, 1):
                    evidences.append("Expiry date may have been backdated")
            except ValueError:
                evidences.append("Expiry date format inconsistent")
    return evidences


class DocumentIntelligenceAgent(BaseAgent):
    agent_name = "document_intelligence"

    async def run(self, case_id: str, payload: dict) -> AgentOutput:
        doc_bytes_hex = payload.get("document_bytes", "")
        doc_type_str = payload.get("doc_type", "PASSPORT")
        doc_type = DocumentType(doc_type_str) if doc_type_str in DocumentType._value2member_map_ else DocumentType.PASSPORT

        image_bytes = bytes.fromhex(doc_bytes_hex) if doc_bytes_hex else b""

        findings = []
        evidence_list = []
        uncertainties = []

        if not image_bytes:
            uncertainties.append("No document bytes provided for analysis")

        tampering = TamperingResult()
        extracted = {}

        if image_bytes:
            ela_result = detect_ela_artifacts(image_bytes)
            if ela_result["tampering_likely"]:
                tampering.tampering_detected = True
                tampering.tampering_type = "IMAGE_MANIPULATION"
                tampering.confidence = min(1.0, ela_result["max_ela_difference"] / 60)
                tampering.evidence = ela_result["suspicious_regions"]
                findings.append(Finding(
                    finding_type="TAMPERING_DETECTED",
                    description=f"ELA indicates possible image manipulation (diff: {ela_result['max_ela_difference']})",
                    confidence=tampering.confidence,
                    evidence=[Evidence(source="ELA", content=e, confidence=0.8) for e in ela_result["suspicious_regions"]],
                ))
                evidence_list.append(Evidence(source="Error Level Analysis", content=str(ela_result), confidence=0.8))

            extracted = extract_fields_with_ocr(image_bytes, doc_type_str)
            text_issues = check_text_tampering(extracted)
            for issue in text_issues:
                findings.append(Finding(
                    finding_type="TEXT_ANOMALY",
                    description=issue,
                    confidence=0.6,
                    evidence=[Evidence(source="Text Analysis", content=issue, confidence=0.6)],
                ))
                evidence_list.append(Evidence(source="Text Consistency Check", content=issue, confidence=0.6))

        confidence = 1.0 - (len(uncertainties) * 0.1 + (tampering.confidence * 0.5 if tampering.tampering_detected else 0))

        recommendation = "PROCEED"
        status = AgentStatus.SUCCESS
        if tampering.tampering_detected:
            if tampering.confidence > 0.8:
                recommendation = "ESCALATE"
                status = AgentStatus.FAILURE
            else:
                recommendation = "REVIEW"
                status = AgentStatus.REVIEW

        return AgentOutput(
            agent_name=self.agent_name,
            status=status,
            confidence=max(0, confidence),
            findings=findings,
            evidence=evidence_list,
            uncertainties=uncertainties,
            recommendation=recommendation,
            policy_versions_used=[],
            trace_id="",
        )
