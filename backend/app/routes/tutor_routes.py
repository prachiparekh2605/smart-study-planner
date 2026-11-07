import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Subject, TutorChat, TutorMessage, DocumentChunk, Material, User
from app.schemas import TutorAskRequest
from app.auth import get_current_user
from app.agents.ai_tutor import AITutorAgent
from app.vector_store import VectorStore

router = APIRouter(prefix="/api/tutor", tags=["AI Tutor"])

@router.post("/ask")
def ask_tutor(
    req: TutorAskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    subject = db.query(Subject).filter(Subject.id == req.subject_id, Subject.user_id == current_user.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Get or create active chat session
    chat = None
    if req.chat_id:
        chat = db.query(TutorChat).filter(TutorChat.id == req.chat_id, TutorChat.user_id == current_user.id).first()
    if not chat:
        chat = TutorChat(
            user_id=current_user.id,
            subject_id=subject.id,
            title=f"Chat: {req.prompt[:30]}..."
        )
        db.add(chat)
        db.commit()
        db.refresh(chat)

    # Save student's user message
    user_msg = TutorMessage(
        chat_id=chat.id,
        role="user",
        content=req.prompt,
        image_url=None
    )
    db.add(user_msg)
    db.commit()

    # Retrieve relevant document chunks (RAG)
    chunks = (
        db.query(DocumentChunk, Material.original_name)
        .join(Material, DocumentChunk.material_id == Material.id)
        .filter(DocumentChunk.subject_id == subject.id)
        .all()
    )

    chunk_dicts = [
        {
            "id": c[0].id,
            "content": c[0].content,
            "page_or_slide": c[0].page_or_slide,
            "material_name": c[1]
        }
        for c in chunks
    ]

    # Search top relevant chunks
    search_query = req.prompt
    if req.topic_context:
        search_query = f"{req.topic_context} {req.prompt}"
    relevant_chunks = VectorStore.search_chunks(search_query, chunk_dicts, top_k=4)

    # Invoke Agent 3: AI Tutor Agent
    agent = AITutorAgent(user_api_key=current_user.gemini_api_key)
    tutor_result = agent.answer_question(
        prompt=req.prompt,
        subject_name=subject.name,
        mode=req.mode or "student_friendly",
        relevant_chunks=relevant_chunks,
        image_base64=req.image_base64
    )

    # Save assistant message
    asst_msg = TutorMessage(
        chat_id=chat.id,
        role="assistant",
        content=tutor_result["answer"],
        citations_json=json.dumps(tutor_result.get("citations", []))
    )
    db.add(asst_msg)
    db.commit()
    db.refresh(asst_msg)

    return {
        "chat_id": chat.id,
        "message_id": asst_msg.id,
        "answer": tutor_result["answer"],
        "citations": tutor_result.get("citations", []),
        "mode": req.mode
    }

@router.get("/history/{subject_id}")
def get_chat_history(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    chat = (
        db.query(TutorChat)
        .filter(TutorChat.subject_id == subject_id, TutorChat.user_id == current_user.id)
        .order_by(TutorChat.created_at.desc())
        .first()
    )

    if not chat:
        return {"chat_id": None, "messages": []}

    messages = db.query(TutorMessage).filter(TutorMessage.chat_id == chat.id).order_by(TutorMessage.created_at.asc()).all()
    return {
        "chat_id": chat.id,
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "citations": json.loads(m.citations_json) if m.citations_json else [],
                "created_at": m.created_at.isoformat()
            }
            for m in messages
        ]
    }

@router.delete("/history/{subject_id}")
def clear_chat_history(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db.query(TutorChat).filter(TutorChat.subject_id == subject_id, TutorChat.user_id == current_user.id).delete()
    db.commit()
    return {"message": "Chat history cleared successfully."}

