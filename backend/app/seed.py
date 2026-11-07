import datetime
import json
from app.database import SessionLocal, Base, engine
from app.models import (
    User, Subject, Material, DocumentChunk, SyllabusUnit, SyllabusTopic,
    StudyPlan, StudySession, Quiz, QuizQuestion, MockExam, MockQuestion,
    FocusLog, FlashcardDeck, Flashcard, TutorChat, TutorMessage
)
from app.auth import hash_password

def seed_demo_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing_user = db.query(User).filter(User.email == "student@example.com").first()
        if existing_user:
            print("Demo user student@example.com already exists. Seeding skipped.")
            return

        print("Seeding initial high-yield demo data for student@example.com...")
        demo_user = User(
            email="student@example.com",
            full_name="Alex Chen",
            hashed_password=hash_password("password123"),
            preferred_daily_hours=3.5
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)

        today = datetime.datetime.utcnow().date()
        exam_date_os = datetime.datetime.combine(today + datetime.timedelta(days=14), datetime.time(9, 0))
        exam_date_dsa = datetime.datetime.combine(today + datetime.timedelta(days=21), datetime.time(9, 0))

        # Subject 1: Operating Systems & Distributed Architecture
        sub_os = Subject(
            user_id=demo_user.id,
            name="Operating Systems & Distributed Architecture",
            code="CS401",
            description="Core systems engineering: concurrency, virtual memory, paging, and distributed consensus.",
            color="#4f46e5",
            exam_date=exam_date_os,
            target_score=95.0
        )
        db.add(sub_os)

        # Subject 2: Advanced Data Structures & Algorithms
        sub_dsa = Subject(
            user_id=demo_user.id,
            name="Advanced Data Structures & Algorithms",
            code="CS301",
            description="Algorithmic paradigms, graph theory, amortized complexity, and dynamic programming.",
            color="#0ea5e9",
            exam_date=exam_date_dsa,
            target_score=92.0
        )
        db.add(sub_dsa)
        db.commit()
        db.refresh(sub_os)
        db.refresh(sub_dsa)

        # Units & Topics for OS
        units_os = [
            ("Unit 1: Process Synchronization & Concurrency", "Critical sections, locks, monitors, and deadlock avoidance.", [
                ("Semaphores & Mutex Primitives", "medium", "critical", 2.0, ["wait(S) { while(S<=0); S--; }", "signal(S) { S++; }"], ["Semaphore is an integer variable accessed via atomic operations."], ["Race conditions", "Mutual exclusion"]),
                ("Deadlock Avoidance & Banker's Algorithm", "hard", "critical", 2.5, ["Need = Max - Allocation", "Available >= Need_i"], ["Deadlock: Set of processes blocked awaiting resource held by another."], ["Resource allocation graphs", "Safe state criteria"]),
                ("CPU Scheduling Algorithms", "easy", "high", 1.5, ["Turnaround = Completion - Arrival", "Waiting = Turnaround - Burst"], ["Preemptive vs Non-preemptive scheduling."], ["Round Robin time quantum", "SJF starvation"])
            ]),
            ("Unit 2: Memory Hierarchy & Virtual Memory", "Paging, segmentation, replacement algorithms, and thrashing.", [
                ("Paging vs Segmentation Models", "medium", "high", 2.0, ["Physical Address = Frame * Size + Offset"], ["Paging avoids external fragmentation through fixed blocks."], ["Page tables", "TLB hit ratio"]),
                ("LRU & Clock Page Replacement", "hard", "critical", 2.0, ["Fault Rate = Misses / Total Accesses"], ["Locality of reference principles."], ["Belady's anomaly in FIFO", "Clock algorithm hand"]),
                ("Working Set Model & Thrashing", "medium", "medium", 1.5, ["Sum(WSS_i) > Total Memory"], ["Thrashing occurs when process spends more time paging than executing."], ["Page fault frequency", "Suspension"])
            ]),
            ("Unit 3: Distributed Systems & Consensus", "Fault tolerance, replication, and distributed consensus.", [
                ("CAP Theorem & PACELC Tradeoffs", "medium", "high", 1.5, ["Consistency vs Availability under Partitions"], ["Brewer's conjecture on distributed storage guarantees."], ["Strict serializability", "Network partition"]),
                ("Raft Consensus Algorithm", "hard", "critical", 3.0, ["Majority = floor(N/2) + 1"], ["Consensus algorithm designed for understandability."], ["Leader election", "Log replication", "Safety invariant"])
            ])
        ]

        for u_idx, (u_title, u_desc, topics_list) in enumerate(units_os, start=1):
            unit_obj = SyllabusUnit(subject_id=sub_os.id, title=u_title, order_num=u_idx, description=u_desc)
            db.add(unit_obj)
            db.commit()
            db.refresh(unit_obj)

            for t_idx, (t_name, diff, imp, hrs, forms, defs, concepts) in enumerate(topics_list, start=1):
                # Mark first two topics completed to show progress!
                is_comp = (u_idx == 1 and t_idx <= 2)
                topic_obj = SyllabusTopic(
                    unit_id=unit_obj.id,
                    subject_id=sub_os.id,
                    name=t_name,
                    difficulty=diff,
                    importance=imp,
                    estimated_hours=hrs,
                    formulas_json=json.dumps(forms),
                    definitions_json=json.dumps(defs),
                    key_concepts_json=json.dumps(concepts),
                    is_completed=is_comp,
                    order_num=t_idx
                )
                db.add(topic_obj)
        db.commit()

        # Upload Sample Material
        mat1 = Material(
            subject_id=sub_os.id,
            user_id=demo_user.id,
            filename="CS401_Core_Lecture_Notes.pdf",
            original_name="CS401_Core_Lecture_Notes.pdf",
            file_type="pdf",
            file_size_bytes=2458000,
            status="ready",
            page_count=48,
            summary="Official course lecture notes covering process scheduling, mutex locks, Banker's algorithm, virtual memory paging, and Raft consensus.",
            storage_path=f"demo_materials/CS401_Core_Lecture_Notes.pdf"
        )
        db.add(mat1)
        db.commit()
        db.refresh(mat1)

        # Chunks for RAG
        sample_chunks = [
            ("A semaphore S is an integer variable that, apart from initialization, is accessed only through two standard atomic operations: wait() and signal(). The wait() operation was originally called P, and signal() was called V. When process P executes wait(S), if S <= 0, the process blocks.", 12),
            ("The Banker's Algorithm evaluates resource requests by verifying if granting the request leaves the system in a 'Safe State'. A state is safe if there exists a sequence <P1, P2, ... Pn> such that for each Pi, the resources that Pi can still request can be satisfied by currently available resources plus resources held by all Pj where j < i.", 19),
            ("Virtual memory decouples the user logical memory from physical memory. Paging maps fixed-size blocks (pages) to physical frame numbers using a page table. The Translation Lookaside Buffer (TLB) caches recent translations to mitigate double-memory-access penalties.", 31),
            ("Raft decomposes consensus into three independent subproblems: Leader Election, Log Replication, and Safety. Raft guarantees that if a leader has committed a particular log entry, that entry will be present in the logs of the leaders for all higher terms.", 44)
        ]
        for c_idx, (text, page) in enumerate(sample_chunks):
            db.add(DocumentChunk(
                material_id=mat1.id,
                subject_id=sub_os.id,
                chunk_index=c_idx,
                content=text,
                page_or_slide=page,
                meta_info=json.dumps({"filename": mat1.original_name, "page": page})
            ))
        db.commit()

        # Study Plan for OS
        os_plan = StudyPlan(
            user_id=demo_user.id,
            subject_id=sub_os.id,
            title="CS401 Final Exam Sprint Plan",
            exam_date=exam_date_os,
            daily_hours=3.5,
            preparation_level="intermediate",
            total_sessions=12,
            is_active=True
        )
        db.add(os_plan)
        db.commit()
        db.refresh(os_plan)

        # Sessions: 2 completed in the past, 1 today, and remaining future
        yesterday = today - datetime.timedelta(days=1)
        day_before = today - datetime.timedelta(days=2)

        sessions_data = [
            (day_before, 9, 90, "study", "Study: Semaphores & Mutex Primitives", "completed", "Mastered atomic wait and signal primitives.", "high"),
            (yesterday, 10, 90, "study", "Study: Deadlock Avoidance & Banker's Algorithm", "completed", "Reviewed safe sequence matrix calculations.", "high"),
            (today, 10, 90, "study", "Study: CPU Scheduling Algorithms", "pending", "Focus on Round Robin time slices and SJF response times.", "medium"),
            (today, 15, 45, "quiz", "Checkpoint Quiz: Process & Synchronization", "pending", "Self-test on race conditions and mutex locks.", "high"),
            (today + datetime.timedelta(days=1), 9, 90, "study", "Study: Paging vs Segmentation Models", "pending", "Calculate address translation offsets and TLB miss penalties.", "high"),
            (today + datetime.timedelta(days=2), 9, 90, "study", "Study: LRU & Clock Page Replacement", "pending", "Simulate Belady's anomaly with FIFO vs LRU.", "high"),
            (today + datetime.timedelta(days=3), 14, 45, "revision", "Spaced Revision: Concurrency & Semaphores", "pending", "Re-test Banker's algorithm safe sequence.", "medium"),
            (today + datetime.timedelta(days=5), 10, 90, "study", "Study: Raft Consensus Algorithm", "pending", "Trace term numbers and leader election quorum.", "high"),
            (today + datetime.timedelta(days=11), 10, 120, "mock_exam", "Full Exam Simulation (Mock Exam 1)", "pending", "Timed examination with objective and subjective sections.", "high"),
            (today + datetime.timedelta(days=13), 15, 90, "revision", "Final Rapid Formula & Flashcard Review", "pending", "Review high-yield formula sheets and weakest topics.", "high")
        ]

        for s_date, s_hour, dur, s_type, title, status, notes, prio in sessions_data:
            db.add(StudySession(
                plan_id=os_plan.id,
                user_id=demo_user.id,
                subject_id=sub_os.id,
                session_date=datetime.datetime.combine(s_date, datetime.time(s_hour, 0)),
                duration_minutes=dur,
                session_type=s_type,
                title=title,
                priority=prio,
                status=status,
                notes=notes,
                completed_at=datetime.datetime.combine(s_date, datetime.time(s_hour + 1, 30)) if status == "completed" else None
            ))
        db.commit()

        # Quiz & Attempts
        quiz1 = Quiz(
            user_id=demo_user.id,
            subject_id=sub_os.id,
            topic_name="Deadlock Avoidance & Banker's Algorithm",
            title="Deadlock Avoidance & Banker's Algorithm - Practice Quiz",
            quiz_type="topic",
            total_questions=3,
            score=66.7,
            time_spent_seconds=210
        )
        db.add(quiz1)
        db.commit()
        db.refresh(quiz1)

        db.add(QuizQuestion(
            quiz_id=quiz1.id,
            question_text="In Banker's Algorithm, what condition verifies that a state is safe?",
            question_type="mcq",
            options_json=json.dumps([
                "A sequence of processes exists where each can satisfy its maximum remaining request with current available resources plus allocated resources of previous processes.",
                "All processes have completed execution.",
                "Available resources equal total physical memory.",
                "No process requests more than one resource at a time."
            ]),
            correct_answer="A sequence of processes exists where each can satisfy its maximum remaining request with current available resources plus allocated resources of previous processes.",
            explanation="A safe sequence guarantees that even if all processes demand maximum requests, no circular wait deadlock occurs.",
            topic_name="Deadlock Avoidance & Banker's Algorithm",
            student_answer="A sequence of processes exists where each can satisfy its maximum remaining request with current available resources plus allocated resources of previous processes.",
            is_correct=True
        ))

        db.add(QuizQuestion(
            quiz_id=quiz1.id,
            question_text="Which of the following is an example of an unsafe state that is NOT currently deadlocked?",
            question_type="mcq",
            options_json=json.dumps([
                "A state where processes can still progress if resource requests occur in favorable order, but deadlock is possible if all demand maximum needs simultaneously.",
                "A state where all resources are idle.",
                "A state with exactly one single process.",
                "A system running with preemption enabled."
            ]),
            correct_answer="A state where processes can still progress if resource requests occur in favorable order, but deadlock is possible if all demand maximum needs simultaneously.",
            explanation="An unsafe state is not necessarily deadlocked; it is simply a state from which the system cannot prevent processes from deadlocking under worst-case resource requests.",
            topic_name="Deadlock Avoidance & Banker's Algorithm",
            student_answer="A state where all resources are idle.",
            is_correct=False
        ))
        db.commit()

        # Flashcards
        deck1 = FlashcardDeck(
            user_id=demo_user.id,
            subject_id=sub_os.id,
            title="OS Concurrency & Virtual Memory High-Yield Deck",
            description="Essential definitions and memory formulas."
        )
        db.add(deck1)
        db.commit()
        db.refresh(deck1)

        cards = [
            ("What is Belady's Anomaly in Paging?", "The counter-intuitive phenomenon where increasing page frame allocation causes an INCREASE in page faults, occurring in FIFO page replacement.", None),
            ("State the 4 Coffman Conditions required for Deadlock:", "1. Mutual Exclusion\n2. Hold and Wait\n3. No Preemption\n4. Circular Wait", "All 4 must hold simultaneously."),
            ("What is the Effective Memory Access Time (EMAT) formula?", "EMAT = (TLB Hit Rate * Access Time) + ((1 - Hit Rate) * (2 * Access Time))", "EMAT = h * c + (1 - h) * 2c"),
            ("What is the difference between Starvation and Deadlock?", "Deadlock is permanent circular blockage of two or more processes. Starvation is indefinite delay of a single process due to scheduling priority biases.", None)
        ]
        for f, b, form in cards:
            db.add(Flashcard(
                deck_id=deck1.id,
                front=f,
                back=b,
                formula=form,
                topic_name="Operating Systems Core",
                repetitions=1,
                interval_days=3,
                ease_factor=2.5,
                next_review_date=datetime.datetime.utcnow() + datetime.timedelta(days=2)
            ))
        db.commit()

        # Focus Logs
        db.add(FocusLog(
            user_id=demo_user.id,
            subject_id=sub_os.id,
            topic_name="Banker's Algorithm Problem Set",
            duration_minutes=50,
            interval_type="50/10",
            completed_at=datetime.datetime.utcnow() - datetime.timedelta(days=1),
            notes="Completed 3 matrix allocation problem derivations."
        ))
        db.add(FocusLog(
            user_id=demo_user.id,
            subject_id=sub_os.id,
            topic_name="Semaphores Implementation",
            duration_minutes=25,
            interval_type="25/5",
            completed_at=datetime.datetime.utcnow(),
            notes="Reviewed producer-consumer bounded buffer problem."
        ))
        db.commit()

        print("Seeding completed successfully! Demo user student@example.com is ready.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_data()

