import io
from fastapi import HTTPException, UploadFile

from app.config.settings import get_settings


async def validate_upload(file: UploadFile) -> bytes:
    settings = get_settings()
    filename = (file.filename or "").lower()
    if not any(filename.endswith(ext) for ext in settings.allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(settings.allowed_extensions)}",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file uploaded")
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="File exceeds 5MB upload limit")
    return content


def extract_text_from_bytes(content: bytes, filename: str) -> str:
    name = filename.lower()
    if name.endswith((".txt", ".md")):
        return content.decode("utf-8", errors="ignore")
    if name.endswith(".pdf"):
        return _extract_pdf(content)
    if name.endswith(".docx"):
        return _extract_docx(content)
    if name.endswith(".rtf"):
        return _extract_rtf(content)
    raise HTTPException(status_code=400, detail="Unsupported file type")


def _extract_pdf(content: bytes) -> str:
    try:
        from PyPDF2 import PdfReader

        reader = PdfReader(io.BytesIO(content))
        parts = []
        for page in reader.pages:
            text = page.extract_text() or ""
            parts.append(text)
        return "\n".join(parts)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {exc}") from exc


def _extract_docx(content: bytes) -> str:
    try:
        from docx import Document

        doc = Document(io.BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to parse DOCX: {exc}") from exc


def _extract_rtf(content: bytes) -> str:
    try:
        from striprtf.striprtf import rtf_to_text

        return rtf_to_text(content.decode("utf-8", errors="ignore"))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to parse RTF: {exc}") from exc
