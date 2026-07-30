import sys
from backend.app import app, db
from backend.models import User, Category, Expense, Budget
from datetime import datetime

with app.app_context():
    # Find a user
    user = User.query.first()
    if not user:
        user = User(email="test@test.com", password_hash="hash")
        db.session.add(user)
        db.session.commit()
        
    print(f"User: {user.id}")
    
    # Create a budget
    b = Budget(user_id=user.id, category_id=None, limit_amount=50000, month_year='2026-07')
    db.session.add(b)
    try:
        db.session.commit()
        print("Budget committed successfully.")
    except Exception as e:
        print(f"Error committing budget: {e}")
        db.session.rollback()

    # Try fetching budgets
    budgets = Budget.query.filter_by(user_id=user.id).all()
    for b in budgets:
        print(b.id, b.category_id, b.limit_amount, b.month_year)
        
        # Test the query
        query = Expense.query.filter_by(user_id=user.id)
        if b.category_id:
            query = query.filter_by(category_id=b.category_id)
            
        expenses = query.all()
        def get_month_str(d):
            if isinstance(d, datetime):
                return d.strftime('%Y-%m')
            elif isinstance(d, str):
                return d[:7]
            return ""
        spent = sum(e.total_amount for e in expenses if get_month_str(e.transaction_date) == b.month_year)
        print(f"Spent: {spent}")
