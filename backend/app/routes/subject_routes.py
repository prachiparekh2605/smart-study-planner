from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Subject, User, SyllabusTopic, SyllabusUnit, Material
from app.schemas import SubjectCreate, SubjectUpdate, SubjectResponse
from app.auth import get_current_user

router = APIRouter(prefix="/api/subjects", tags=["Subjects"])

@router.get("", response_model=List[SubjectResponse])
def get_subjects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    subjects = db.query(Subject).filter(Subject.user_id == current_user.id).order_by(Subject.created_at.desc()).all()
    result = []
    for s in subjects:
        materials_count = db.query(Material).filter(Material.subject_id == s.id).count()
        units_count = db.query(SyllabusUnit).filter(SyllabusUnit.subject_id == s.id).count()
        topics = db.query(SyllabusTopic).filter(SyllabusTopic.subject_id == s.id).all()
        topics_count = len(topics)
        completed_topics_count = sum(1 for t in topics if t.is_completed)
        progress = round((completed_topics_count / max(topics_count, 1)) * 100, 1) if topics_count > 0 else 0.0

        result.append(SubjectResponse(
            id=s.id,
            name=s.name,
            code=s.code,
            description=s.description,
            color=s.color or "#4f46e5",
            exam_date=s.exam_date,
            target_score=s.target_score or 90.0,
            created_at=s.created_at,
            materials_count=materials_count,
            units_count=units_count,
            topics_count=topics_count,
            completed_topics_count=completed_topics_count,
            progress_percentage=progress
        ))
    return result

@router.post("", response_model=SubjectResponse)
def create_subject(
    subject_data: SubjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_sub = Subject(
        user_id=current_user.id,
        name=subject_data.name,
        code=subject_data.code,
        description=subject_data.description,
        color=subject_data.color or "#4f46e5",
        exam_date=subject_data.exam_date,
        target_score=subject_data.target_score or 90.0
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)

    return SubjectResponse(
        id=new_sub.id,
        name=new_sub.name,
        code=new_sub.code,
        description=new_sub.description,
        color=new_sub.color,
        exam_date=new_sub.exam_date,
        target_score=new_sub.target_score,
        created_at=new_sub.created_at,
        materials_count=0,
        units_count=0,
        topics_count=0,
        completed_topics_count=0,
        progress_percentage=0.0
    )

@router.get("/{subject_id}", response_model=SubjectResponse)
def get_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sub = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == current_user.id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subject not found")

    materials_count = db.query(Material).filter(Material.subject_id == sub.id).count()
    units_count = db.query(SyllabusUnit).filter(SyllabusUnit.subject_id == sub.id).count()
    topics = db.query(SyllabusTopic).filter(SyllabusTopic.subject_id == sub.id).all()
    topics_count = len(topics)
    completed_topics_count = sum(1 for t in topics if t.is_completed)
    progress = round((completed_topics_count / max(topics_count, 1)) * 100, 1) if topics_count > 0 else 0.0

    return SubjectResponse(
        id=sub.id,
        name=sub.name,
        code=sub.code,
        description=sub.description,
        color=sub.color or "#4f46e5",
        exam_date=sub.exam_date,
        target_score=sub.target_score,
        created_at=sub.created_at,
        materials_count=materials_count,
        units_count=units_count,
        topics_count=topics_count,
        completed_topics_count=completed_topics_count,
        progress_percentage=progress
    )

@router.put("/{subject_id}", response_model=SubjectResponse)
def update_subject(
    subject_id: int,
    subject_data: SubjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sub = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == current_user.id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subject not found")

    if subject_data.name is not None:
        sub.name = subject_data.name
    if subject_data.code is not None:
        sub.code = subject_data.code
    if subject_data.description is not None:
        sub.description = subject_data.description
    if subject_data.color is not None:
        sub.color = subject_data.color
    if subject_data.exam_date is not None:
        sub.exam_date = subject_data.exam_date
    if subject_data.target_score is not None:
        sub.target_score = subject_data.target_score

    db.commit()
    db.refresh(sub)

    materials_count = db.query(Material).filter(Material.subject_id == sub.id).count()
    units_count = db.query(SyllabusUnit).filter(SyllabusUnit.subject_id == sub.id).count()
    topics = db.query(SyllabusTopic).filter(SyllabusTopic.subject_id == sub.id).all()
    topics_count = len(topics)
    completed_topics_count = sum(1 for t in topics if t.is_completed)
    progress = round((completed_topics_count / max(topics_count, 1)) * 100, 1) if topics_count > 0 else 0.0

    return SubjectResponse(
        id=sub.id,
        name=sub.name,
        code=sub.code,
        description=sub.description,
        color=sub.color,
        exam_date=sub.exam_date,
        target_score=sub.target_score,
        created_at=sub.created_at,
        materials_count=materials_count,
        units_count=units_count,
        topics_count=topics_count,
        completed_topics_count=completed_topics_count,
        progress_percentage=progress
    )

@router.delete("/{subject_id}")
def delete_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sub = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == current_user.id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subject not found")

    db.delete(sub)
    db.commit()
    return {"message": "Subject deleted successfully"}

