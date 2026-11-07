import os
import uuid
import json
from typing import List
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db, SessionLocal
from app.models import Material, DocumentChunk, Subject, User
from app.config import UPLOAD_DIR, ALLOWED_EXTENSIONS, MAX_FILE_SIZE_MB
from app.auth import get_current_user
from app.document_processor import DocumentProcessor
from app.vector_store import VectorStore

router = APIRouter(prefix="/api/materials", tags=["Materials"])

def process_material_background(material_id: int):
    """
    Background worker that runs text extraction, chunking, and indexing.
    Updates material status to 'ready' or 'error'.
    """
    db = SessionLocal()
    try:
        mat = db.query(Material).filter(Material.id == material_id).first()
        if not mat:
            return

        mat.status = "processing"
        db.commit()

        # Extract text pages
        pages = DocumentProcessor.extract_text_from_file(mat.storage_path, mat.file_type)
        mat.page_count = len(pages)

        # Generate quick summary from first 1-2 pages
        sample_text = " ".join(p["text"] for p in pages[:2]).strip()
        mat.summary = sample_text[:350] + ("..." if len(sample_text) > 350 else "")

        # Chunk document
        chunks = DocumentProcessor.chunk_document(pages, chunk_size=800, chunk_overlap=150)

        # Clear existing chunks if re-processing
        db.query(DocumentChunk).filter(DocumentChunk.material_id == mat.id).delete()

        # Save chunks with semantic vector representations
        for ch in chunks:
            chunk_obj = DocumentChunk(
                material_id=mat.id,
                subject_id=mat.subject_id,
                chunk_index=ch["chunk_index"],
                content=ch["content"],
                page_or_slide=ch["page_or_slide"],
                meta_info=json.dumps({"filename": mat.original_name, "page": ch["page_or_slide"]})
            )
            db.add(chunk_obj)

        mat.status = "ready"
        mat.error_message = None
        db.commit()
    except Exception as e:
        print(f"[process_material_background] Error processing {material_id}: {e}")
        try:
            mat = db.query(Material).filter(Material.id == material_id).first()
            if mat:
                mat.status = "error"
                mat.error_message = str(e)
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


@router.post("/upload")
async def upload_materials(
    background_tasks: BackgroundTasks,
    subject_id: int = Form(...),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify subject ownership
    subject = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == current_user.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    uploaded_records = []
    subject_folder = Path(UPLOAD_DIR) / f"user_{current_user.id}" / f"sub_{subject_id}"
    subject_folder.mkdir(parents=True, exist_ok=True)

    for file in files:
        ext = Path(file.filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            continue

        unique_name = f"{uuid.uuid4().hex[:8]}_{file.filename}"
        dest_path = subject_folder / unique_name

        # Read content and save
        content = await file.read()
        file_size = len(content)

        # Check provider/infrastructure storage limit
        if file_size > MAX_FILE_SIZE_MB * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail=f"File {file.filename} exceeds maximum allowed size of {MAX_FILE_SIZE_MB}MB."
            )

        with open(dest_path, "wb") as f:
            f.write(content)

        # Create record in DB
        mat = Material(
            subject_id=subject_id,
            user_id=current_user.id,
            filename=unique_name,
            original_name=file.filename,
            file_type=ext.replace(".", ""),
            file_size_bytes=file_size,
            status="pending",
            storage_path=str(dest_path)
        )
        db.add(mat)
        db.commit()
        db.refresh(mat)

        # Enqueue background processing
        background_tasks.add_task(process_material_background, mat.id)

        uploaded_records.append({
            "id": mat.id,
            "filename": mat.original_name,
            "file_type": mat.file_type,
            "file_size_bytes": mat.file_size_bytes,
            "status": mat.status
        })

    return {
        "message": f"Successfully queued {len(uploaded_records)} file(s) for background processing.",
        "materials": uploaded_records
    }


@router.get("/subject/{subject_id}")
def get_subject_materials(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    subject = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == current_user.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    materials = db.query(Material).filter(
        Material.subject_id == subject_id,
        Material.user_id == current_user.id
    ).order_by(Material.created_at.desc()).all()

    return [
        {
            "id": m.id,
            "filename": m.original_name,
            "file_type": m.file_type,
            "file_size_bytes": m.file_size_bytes,
            "status": m.status,
            "error_message": m.error_message,
            "page_count": m.page_count,
            "summary": m.summary,
            "created_at": m.created_at
        }
        for m in materials
    ]


@router.get("/{material_id}/preview")
def get_material_preview(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    mat = db.query(Material).filter(Material.id == material_id, Material.user_id == current_user.id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")

    chunks = db.query(DocumentChunk).filter(DocumentChunk.material_id == mat.id).order_by(DocumentChunk.chunk_index).all()
    return {
        "id": mat.id,
        "filename": mat.original_name,
        "file_type": mat.file_type,
        "status": mat.status,
        "page_count": mat.page_count,
        "summary": mat.summary,
        "chunks": [
            {
                "chunk_index": c.chunk_index,
                "page_or_slide": c.page_or_slide,
                "content": c.content
            }
            for c in chunks[:30]  # preview first 30 chunks
        ]
    }


@router.delete("/{material_id}")
def delete_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    mat = db.query(Material).filter(Material.id == material_id, Material.user_id == current_user.id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")

    # Remove file from disk
    try:
        if os.path.exists(mat.storage_path):
            os.remove(mat.storage_path)
    except Exception:
        pass

    db.delete(mat)
    db.commit()
    return {"message": "Material removed successfully."}


@router.post("/{material_id}/reprocess")
def reprocess_material(
    material_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    mat = db.query(Material).filter(Material.id == material_id, Material.user_id == current_user.id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")

    mat.status = "pending"
    db.commit()
    background_tasks.add_task(process_material_background, mat.id)
    return {"message": "Reprocessing started in background."}

