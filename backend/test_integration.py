import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, get_db
from main import app

# In-memory SQLite for high-speed automated integration tests
TEST_DATABASE_URL = "sqlite:///./test_gravequit.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

Base.metadata.create_all(bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

def test_full_system_flow():
    print("\n--- 1. Health Check ---")
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["status"] == "operational"
    print("Health check passed.")

    print("\n--- 2. Auth Flow (Signup & Login) ---")
    from datetime import datetime, timezone, timedelta
    from models import VerificationCode
    
    user_email = "test.student@univ.edu"
    user_pass = "SecureSanctuary2026!"
    verification_code = "123456"
    
    # Pre-seed verification code in test DB
    with TestingSessionLocal() as test_db:
        test_db.query(VerificationCode).filter(VerificationCode.email == user_email).delete()
        test_db.add(VerificationCode(
            email=user_email,
            code=verification_code,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10)
        ))
        test_db.commit()
    
    # Signup
    signup_res = client.post("/auth/signup", json={"email": user_email, "password": user_pass, "code": verification_code})
    assert signup_res.status_code in [200, 400]
    
    # Login
    login_res = client.post("/auth/login", json={"email": user_email, "password": user_pass})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    user_id = login_res.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"Logged in user {user_id} with token: {token[:15]}...")

    # Current User Profile
    me_res = client.get("/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == user_email
    print("User profile retrieved successfully.")

    print("\n--- 3. Items CRUD & Per-User Isolation ---")
    # Create item
    item_res = client.post("/items", headers=headers, json={
        "title": "Quantum Mechanics 101",
        "category": "Course",
        "note": "Problem sets are demanding"
    })
    assert item_res.status_code == 200
    item_id = item_res.json()["id"]
    print(f"Created item #{item_id}: {item_res.json()['title']}")

    # List items
    list_res = client.get("/items", headers=headers)
    assert list_res.status_code == 200
    assert any(i["id"] == item_id for i in list_res.json())
    print(f"Items listed: {len(list_res.json())} items found for user.")

    # Quit item (10-second flow)
    quit_res = client.patch(f"/items/{item_id}/quit", headers=headers, json={
        "reason_tag": "Too Busy",
        "reason_text": "Midterm exams overlapping with laboratory schedule"
    })
    assert quit_res.status_code == 200
    assert quit_res.json()["status"] == "quit"
    assert quit_res.json()["reason_tag"] == "Too Busy"
    print(f"Quit item #{item_id} successfully.")

    print("\n--- 4. Pattern Summary & AI Feedback ---")
    # Fetch summary
    summary_res = client.get("/patterns/summary", headers=headers)
    assert summary_res.status_code == 200
    summary_data = summary_res.json()
    assert summary_data["stats"]["total_quit"] >= 1
    assert "ai_summary" in summary_data
    print(f"Summary generated: {summary_data['ai_summary'][:70]}...")

    # Submit Thumbs Up Feedback
    feedback_res = client.post("/patterns/feedback", headers=headers, json={
        "summary_id": summary_data.get("id"),
        "rating": 1,
        "feedback_text": "Insight matches my actual exam schedule."
    })
    assert feedback_res.status_code == 200
    assert feedback_res.json()["rating"] == 1
    print("Feedback submitted to database.")

    print("\n--- 5. Advisor & Internal Metrics Dashboards ---")
    # Grant admin role to test user for accessing metrics endpoints
    from models import User
    with TestingSessionLocal() as test_db:
        u = test_db.query(User).filter(User.id == user_id).first()
        if u:
            u.role = "admin"
            test_db.commit()

    advisor_res = client.get("/metrics/advisor", headers=headers)
    assert advisor_res.status_code == 200
    assert "activeStudents" in advisor_res.json()
    assert "closureDrivers" in advisor_res.json()
    print("Advisor metrics calculated successfully.")

    internal_res = client.get("/metrics/internal", headers=headers)
    assert internal_res.status_code == 200
    assert internal_res.json()["thumbsUpCount"] >= 1
    print(f"Internal metrics: {internal_res.json()['thumbsUpCount']} thumbs up, accuracy: {internal_res.json()['aiAccuracyRate']}%")

    print("\n--- 6. Retrain AI Model Endpoint ---")
    admin_key = os.environ.get("ADMIN_API_KEY", "")
    admin_headers = {"X-Admin-Api-Key": admin_key} if admin_key else {}
    retrain_res = client.post("/admin/retrain", headers=admin_headers)
    assert retrain_res.status_code == 200
    assert retrain_res.json()["status"] == "success"
    print(f"Admin retrain completed: {retrain_res.json()['message']}")

    print("\n--- 7. Weekly Digest Notification ---")
    digest_res = client.get("/notifications/weekly-digest/preview", headers=headers)
    assert digest_res.status_code == 200
    assert "email_body" in digest_res.json()
    print("Weekly digest preview generated.")

    print("\n--- 8. Delete Item ---")
    del_res = client.delete(f"/items/{item_id}", headers=headers)
    assert del_res.status_code == 200
    print(f"Deleted item #{item_id}.")

    print("\n=== ALL INTEGRATION TESTS PASSED ===")

if __name__ == "__main__":
    test_full_system_flow()
