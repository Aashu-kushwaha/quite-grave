
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
import numpy as np

from database import get_db
from models import Item
from ml_model import risk_model
from security_logger import security_logger
from auth import require_admin

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post(
    "/retrain",
    dependencies=[Depends(require_admin)]
)
def retrain_model(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Retrain the quit-risk model using historical resolved items.
    Only authenticated admin users can access this endpoint.
    """

    forwarded = request.headers.get("x-forwarded-for", "")
    client_ip = (
        forwarded.split(",")[0].strip()
        if forwarded
        else (
            request.client.host
            if request.client
            else "unknown"
        )
    )

    security_logger.info(
        f"Admin retrain endpoint accessed - IP: {client_ip}"
    )

    # Fetch resolved items
    items = (
        db.query(Item)
        .filter(Item.status.in_(["quit", "completed"]))
        .all()
    )

    # Use baseline training when insufficient records exist
    if len(items) < 6:
        risk_model.train_on_synthetic_data()

        security_logger.info(
            f"Model trained using baseline data. "
            f"Database records: {len(items)}"
        )

        return {
            "status": "success",
            "message": (
                f"Retrained using the baseline model. Found "
                f"{len(items)} database records; at least 6 "
                f"are needed for full dynamic regression."
            ),
            "records_used": len(items),
            "mode": "hybrid_baseline"
        }

    X_list = []
    y_list = []

    for item in items:
        if not item.ended_at or not item.started_at:
            continue

        started = (
            item.started_at.replace(tzinfo=None)
            if item.started_at.tzinfo
            else item.started_at
        )

        ended = (
            item.ended_at.replace(tzinfo=None)
            if item.ended_at.tzinfo
            else item.ended_at
        )

        days_active = max(1, (ended - started).days)

        # Use only items resolved before this item started.
        past_items = (
            db.query(Item)
            .filter(
                Item.user_id == item.user_id,
                Item.ended_at.isnot(None),
                Item.ended_at < item.started_at
            )
            .all()
        )

        user_total_quit = sum(
            1 for past_item in past_items
            if past_item.status == "quit"
        )

        user_total_completed = sum(
            1 for past_item in past_items
            if past_item.status == "completed"
        )

        target = 1 if item.status == "quit" else 0

        X_list.append([
            days_active,
            user_total_quit,
            user_total_completed
        ])

        y_list.append(target)

    # Handle records without usable timestamps
    if not X_list:
        security_logger.warning(
            "Retraining skipped: no records had valid start/end timestamps."
        )

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No usable historical records found for retraining."
        )

    X = np.array(X_list, dtype=float)
    y = np.array(y_list, dtype=int)

    # A classifier needs examples from both classes
    if len(np.unique(y)) < 2:
        risk_model.train_on_synthetic_data()

        class_name = "quit" if y[0] == 1 else "completed"

        security_logger.info(
            f"Model trained using baseline fallback. "
            f"Observed class: {class_name}; records: {len(X)}"
        )

        return {
            "status": "success",
            "message": (
                f"The historical dataset contains only the "
                f"'{class_name}' class. The baseline model was trained instead."
            ),
            "records_used": len(X),
            "mode": "regularized_prior"
        }

    # Train on historical records
    try:
        risk_model.train(X, y)
    except Exception:
        security_logger.exception(
            "Model retraining failed."
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Model retraining failed. Check the backend logs."
        )

    security_logger.info(
        f"ML model retrained successfully. "
        f"Mode: live_data; records: {len(X)}"
    )

    return {
        "status": "success",
        "message": (
            f"Successfully retrained the quit-risk model "
            f"using {len(X)} historical database records."
        ),
        "records_used": len(X),
        "mode": "live_data"
    }
