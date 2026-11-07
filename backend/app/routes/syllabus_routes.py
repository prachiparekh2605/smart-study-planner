import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Subject, SyllabusUnit, SyllabusTopic, Material, DocumentChunk, User
from app.schemas import TopicCreate, TopicUpdate, UnitCreate
from app.auth import get_current_user
from app.agents.syllabus_analyzer import SyllabusAnalyzerAgent

router = APIRouter(prefix="/api/syllabus", tags=["Syllabus"])

@router.post("/extract/{subject_id}")
def extract_syllabus(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    subject = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == current_user.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    materials = db.query(Material).filter(Material.subject_id == subject_id, Material.user_id == current_user.id).all()
    
    # Gather extracted content samples
    material_summaries = []
    for m in materials:
        chunks = db.query(DocumentChunk).filter(DocumentChunk.material_id == m.id).order_by(DocumentChunk.chunk_index).all()
        full_sample = " ".join(c.content for c in chunks[:15])
        material_summaries.append({
            "filename": m.original_name,
            "text_sample": full_sample or m.summary or ""
        })

    # Run Agent 1: Syllabus Analyzer Agent
    agent = SyllabusAnalyzerAgent(user_api_key=current_user.gemini_api_key)
    analysis_result = agent.analyze_materials(subject.name, material_summaries)

    # Clear existing units and topics to reload newly structured syllabus
    # Nullify topic_id on study sessions first to preserve foreign key integrity
    from app.models import StudySession
    db.query(StudySession).filter(StudySession.subject_id == subject.id).update({"topic_id": None})
    db.query(SyllabusTopic).filter(SyllabusTopic.subject_id == subject.id).delete()
    db.query(SyllabusUnit).filter(SyllabusUnit.subject_id == subject.id).delete()
    db.commit()

    saved_units = []
    for u_idx, u_data in enumerate(analysis_result.get("units", []), start=1):
        unit_obj = SyllabusUnit(
            subject_id=subject.id,
            title=u_data.get("title", f"Unit {u_idx}"),
            order_num=u_idx,
            description=u_data.get("description", "")
        )
        db.add(unit_obj)
        db.commit()
        db.refresh(unit_obj)

        saved_topics = []
        for t_idx, t_data in enumerate(u_data.get("topics", []), start=1):
            topic_obj = SyllabusTopic(
                unit_id=unit_obj.id,
                subject_id=subject.id,
                name=t_data.get("name", f"Topic {t_idx}"),
                difficulty=t_data.get("difficulty", "medium"),
                importance=t_data.get("importance", "medium"),
                estimated_hours=float(t_data.get("estimated_hours", 1.5)),
                formulas_json=json.dumps(t_data.get("formulas", [])),
                definitions_json=json.dumps(t_data.get("definitions", [])),
                key_concepts_json=json.dumps(t_data.get("key_concepts", [])),
                is_completed=False,
                order_num=t_idx
            )
            db.add(topic_obj)
            saved_topics.append(topic_obj)

        db.commit()
        saved_units.append(unit_obj)

    return {
        "message": f"Successfully extracted {len(saved_units)} units for {subject.name}.",
        "repeated_topics_detected": analysis_result.get("repeated_topics_detected", []),
        "missing_prerequisites": analysis_result.get("missing_prerequisites", []),
        "exam_weightage_analysis": analysis_result.get("exam_weightage_analysis", "")
    }

@router.get("/subject/{subject_id}")
def get_syllabus(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    subject = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == current_user.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    units = db.query(SyllabusUnit).filter(SyllabusUnit.subject_id == subject.id).order_by(SyllabusUnit.order_num).all()
    result_units = []

    for u in units:
        topics = db.query(SyllabusTopic).filter(SyllabusTopic.unit_id == u.id).order_by(SyllabusTopic.order_num).all()
        topic_list = []
        for t in topics:
            formulas = json.loads(t.formulas_json) if t.formulas_json else []
            definitions = json.loads(t.definitions_json) if t.definitions_json else []
            key_concepts = json.loads(t.key_concepts_json) if t.key_concepts_json else []
            topic_list.append({
                "id": t.id,
                "name": t.name,
                "difficulty": t.difficulty,
                "importance": t.importance,
                "estimated_hours": t.estimated_hours,
                "formulas": formulas,
                "definitions": definitions,
                "key_concepts": key_concepts,
                "is_completed": t.is_completed,
                "order_num": t.order_num
            })

        result_units.append({
            "id": u.id,
            "title": u.title,
            "order_num": u.order_num,
            "description": u.description,
            "topics": topic_list
        })

    return {
        "subject_id": subject.id,
        "subject_name": subject.name,
        "units": result_units
    }

@router.post("/units/{unit_id}/topics")
def add_topic(
    unit_id: int,
    topic_data: TopicCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    unit = db.query(SyllabusUnit).filter(SyllabusUnit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    # verify subject belongs to user
    subject = db.query(Subject).filter(Subject.id == unit.subject_id, Subject.user_id == current_user.id).first()
    if not subject:
        raise HTTPException(status_code=403, detail="Not authorized")

    new_topic = SyllabusTopic(
        unit_id=unit.id,
        subject_id=subject.id,
        name=topic_data.name,
        difficulty=topic_data.difficulty or "medium",
        importance=topic_data.importance or "medium",
        estimated_hours=topic_data.estimated_hours or 1.5,
        formulas_json=json.dumps(topic_data.formulas or []),
        definitions_json=json.dumps(topic_data.definitions or []),
        key_concepts_json=json.dumps(topic_data.key_concepts or []),
        is_completed=False
    )
    db.add(new_topic)
    db.commit()
    db.refresh(new_topic)
    return {"message": "Topic added successfully", "topic_id": new_topic.id}

@router.put("/topics/{topic_id}")
def update_topic(
    topic_id: int,
    update_data: TopicUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    topic = db.query(SyllabusTopic).filter(SyllabusTopic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    subject = db.query(Subject).filter(Subject.id == topic.subject_id, Subject.user_id == current_user.id).first()
    if not subject:
        raise HTTPException(status_code=403, detail="Not authorized")

    if update_data.name is not None:
        topic.name = update_data.name
    if update_data.difficulty is not None:
        topic.difficulty = update_data.difficulty
    if update_data.importance is not None:
        topic.importance = update_data.importance
    if update_data.estimated_hours is not None:
        topic.estimated_hours = update_data.estimated_hours
    if update_data.is_completed is not None:
        topic.is_completed = update_data.is_completed

    db.commit()
    db.refresh(topic)
    return {"message": "Topic updated successfully", "is_completed": topic.is_completed}

@router.delete("/topics/{topic_id}")
def delete_topic(
    topic_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    topic = db.query(SyllabusTopic).filter(SyllabusTopic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    subject = db.query(Subject).filter(Subject.id == topic.subject_id, Subject.user_id == current_user.id).first()
    if not subject:
        raise HTTPException(status_code=403, detail="Not authorized")

    db.delete(topic)
    db.commit()
    return {"message": "Topic removed successfully"}
