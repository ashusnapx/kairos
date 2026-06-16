import os
import uuid
import structlog

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from sqlalchemy import select

from src.config import settings
from src.orchestrator.workflow import run_case
from src.services.extraction import extract_document, verify_face
from src.storage.postgres import async_session, Case, Document
from src.core.constants import DocumentType

logger = structlog.get_logger()
router = APIRouter(prefix="/api/upload", tags=["upload"])


ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "tiff", "bmp", "pdf"}


def _validate_file(file: UploadFile | None, field_name: str) -> tuple[bytes, str]:
    if file is None:
        raise HTTPException(status_code=400, detail=f"{field_name} is required")

    filename = file.filename or ""
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    if not ext or ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{ext}' for {field_name}. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    contents = file.file.read()
    if not contents:
        raise HTTPException(status_code=400, detail=f"{field_name} is empty")
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"{field_name} exceeds 10MB limit")

    return contents, ext


@router.post("")
async def upload_files(
    customer_name: str = Form(...),
    aadhaar: UploadFile | None = File(None),
    pan: UploadFile | None = File(None),
    selfie: UploadFile | None = File(None),
    bank_statement: UploadFile | None = File(None),
):
    case_id = uuid.uuid4().hex[:12]
    upload_base = settings.upload_dir or "/tmp/kairos-uploads"
    case_dir = os.path.join(upload_base, case_id)
    os.makedirs(case_dir, exist_ok=True)

    saved_files: dict[str, str] = {}
    ocr_results: dict[str, dict] = {}
    face_result: dict | None = None
    uploaded_types: list[str] = []

    async def _save(field: str, file: UploadFile | None) -> str | None:
        if file is None:
            return None
        contents, ext = _validate_file(file, field)
        dest = os.path.join(case_dir, f"{field}.{ext}")
        with open(dest, "wb") as f:
            f.write(contents)
        saved_files[field] = dest
        return dest

    await _save("aadhaar", aadhaar)
    await _save("pan", pan)
    await _save("selfie", selfie)
    await _save("bank_statement", bank_statement)

    if "aadhaar" in saved_files:
        ocr_results["aadhaar"] = await extract_document(
            saved_files["aadhaar"], "AADHAAR"
        )
        uploaded_types.append("AADHAAR")

    if "pan" in saved_files:
        ocr_results["pan"] = await extract_document(
            saved_files["pan"], "PAN"
        )
        uploaded_types.append("PAN")

    if "selfie" in saved_files:
        doc_photo_path = saved_files.get("aadhaar") or saved_files.get("pan")
        if doc_photo_path:
            face_result = await verify_face(
                saved_files["selfie"], doc_photo_path
            )

    combined_fields: dict[str, str | None] = {
        "name": None,
        "dob": None,
        "document_number": None,
        "address": None,
    }
    for ocr_res in ocr_results.values():
        for key in combined_fields:
            val = ocr_res.get("fields", {}).get(key)
            if val and not combined_fields[key]:
                combined_fields[key] = val

    ocr_confidence = 0.0
    if ocr_results:
        ocr_confidence = (
            sum(r.get("confidence", 0.0) for r in ocr_results.values())
            / len(ocr_results)
        )

    case_payload = {
        "customer_name": customer_name,
        "customer_id": f"CUST-{uuid.uuid4().hex[:8].upper()}",
        "documents": uploaded_types or ["PASSPORT"],
        "address": combined_fields.get("address") or "",
        "extracted_fields": combined_fields,
    }
    workflow_result = await run_case(case_payload)
    workflow_case_id = workflow_result.get("case_id", "")
    if not workflow_case_id:
        workflow_case_id = case_id

    async with async_session() as session:
        for field_name, file_path in saved_files.items():
            if field_name == "selfie":
                continue
            doc_type_str = field_name.upper()
            doc = Document(
                case_id=workflow_case_id,
                doc_type=(
                    DocumentType(doc_type_str)
                    if doc_type_str in DocumentType._value2member_map_
                    else DocumentType.PASSPORT
                ),
                file_path=file_path,
                extracted_data=combined_fields,
                ocr_confidence=ocr_confidence,
            )
            session.add(doc)
        await session.commit()

    extracted_docs = list(saved_files.keys())
    return {
        "case_id": workflow_case_id,
        "customer_name": customer_name,
        "extracted_fields": combined_fields,
        "ocr_confidence": round(ocr_confidence, 2),
        "face_verification": face_result,
        "extracted_docs": extracted_docs,
        "trace_id": workflow_result.get("trace_id", ""),
    }


@router.get("/{case_id}")
async def get_upload_status(case_id: str):
    async with async_session() as session:
        case = await session.get(Case, case_id)
        if not case:
            raise HTTPException(status_code=404, detail="Case not found")

        doc_result = await session.execute(
            select(Document).where(Document.case_id == case_id)
        )
        docs = doc_result.scalars().all()

        return {
            "case_id": case.id,
            "customer_name": case.customer_name,
            "status": case.status,
            "risk_score": case.risk_score,
            "decision": case.decision,
            "documents": [
                {
                    "id": d.id,
                    "type": d.doc_type,
                    "extracted": d.extracted_data,
                    "ocr_confidence": d.ocr_confidence,
                }
                for d in docs
            ],
        }
