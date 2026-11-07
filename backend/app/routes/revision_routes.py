import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Subject, FlashcardDeck, Flashcard, SyllabusUnit, SyllabusTopic, User
from app.schemas import FlashcardDeckCreate, FlashcardReviewRequest
from app.auth import get_current_user
from app.agents.revision_agent import RevisionAgent

router = APIRouter(prefix="/api/revision", tags=["Revision"])

@router.post("/flashcards/generate")
def generate_flashcards(
    req: FlashcardDeckCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    subject = db.query(Subject).filter(Subject.id == req.subject_id, Subject.user_id == current_user.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    agent = RevisionAgent(user_api_key=current_user.gemini_api_key)
    cards_data = agent.generate_flashcards(
        subject_name=subject.name,
        topic_name=req.topic_name,
        num_cards=req.num_cards
    )

    deck = FlashcardDeck(
        user_id=current_user.id,
        subject_id=subject.id,
        title=f"{req.topic_name or subject.name} Spaced Flashcards",
        description=f"Generated high-yield revision deck for {subject.name}"
    )
    db.add(deck)
    db.commit()
    db.refresh(deck)

    saved_cards = []
    for c in cards_data:
        fc = Flashcard(
            deck_id=deck.id,
            front=c["front"],
            back=c["back"],
            formula=c.get("formula"),
            topic_name=c.get("topic_name") or req.topic_name or subject.name
        )
        db.add(fc)
        saved_cards.append(fc)

    db.commit()

    return {
        "deck_id": deck.id,
        "title": deck.title,
        "total_cards": len(saved_cards)
    }

@router.get("/flashcards/subject/{subject_id}")
def get_subject_decks(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    decks = db.query(FlashcardDeck).filter(
        FlashcardDeck.subject_id == subject_id,
        FlashcardDeck.user_id == current_user.id
    ).all()

    result = []
    for d in decks:
        cards_count = db.query(Flashcard).filter(Flashcard.deck_id == d.id).count()
        result.append({
            "id": d.id,
            "title": d.title,
            "description": d.description,
            "cards_count": cards_count,
            "created_at": d.created_at.isoformat()
        })
    return result

@router.get("/flashcards/deck/{deck_id}")
def get_deck_cards(
    deck_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    deck = db.query(FlashcardDeck).filter(FlashcardDeck.id == deck_id, FlashcardDeck.user_id == current_user.id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    cards = db.query(Flashcard).filter(Flashcard.deck_id == deck.id).all()
    return {
        "id": deck.id,
        "title": deck.title,
        "cards": [
            {
                "id": c.id,
                "front": c.front,
                "back": c.back,
                "formula": c.formula,
                "topic_name": c.topic_name,
                "repetitions": c.repetitions,
                "interval_days": c.interval_days,
                "ease_factor": c.ease_factor,
                "next_review_date": c.next_review_date.isoformat()
            }
            for c in cards
        ]
    }

@router.post("/flashcards/review")
def review_flashcard(
    req: FlashcardReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    card = db.query(Flashcard).filter(Flashcard.id == req.card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Flashcard not found")

    # Apply SuperMemo SM-2 calculation
    sm2_res = RevisionAgent.calculate_sm2_repetition(
        rating=req.rating,
        repetitions=card.repetitions,
        interval_days=card.interval_days,
        ease_factor=card.ease_factor
    )

    card.repetitions = sm2_res["repetitions"]
    card.interval_days = sm2_res["interval_days"]
    card.ease_factor = sm2_res["ease_factor"]
    card.next_review_date = sm2_res["next_review_date"]

    db.commit()

    return {
        "card_id": card.id,
        "interval_days": card.interval_days,
        "ease_factor": card.ease_factor,
        "next_review_date": card.next_review_date.isoformat()
    }

@router.get("/formula-sheet/{subject_id}")
def get_formula_sheet(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    subject = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == current_user.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    units = db.query(SyllabusUnit).filter(SyllabusUnit.subject_id == subject.id).all()
    units_data = []
    for u in units:
        topics = db.query(SyllabusTopic).filter(SyllabusTopic.unit_id == u.id).all()
        units_data.append({
            "title": u.title,
            "topics": [
                {
                    "name": t.name,
                    "formulas": json.loads(t.formulas_json) if t.formulas_json else []
                }
                for t in topics
            ]
        })

    agent = RevisionAgent(user_api_key=current_user.gemini_api_key)
    sheet = agent.generate_formula_sheet(subject.name, units_data)
    return sheet

