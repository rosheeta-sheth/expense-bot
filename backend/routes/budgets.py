from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

from models import db, Budget, Expense, Category

budgets_bp = Blueprint('budgets', __name__)

@budgets_bp.route('', methods=['GET'])
@jwt_required()
def get_budgets():
    current_user_id = get_jwt_identity()
    # E.g. get budgets for current month "2026-07"
    month = request.args.get('month', datetime.now().strftime('%Y-%m'))
    
    budgets = Budget.query.filter_by(user_id=current_user_id, month_year=month).all()
    
    result = []
    for b in budgets:
        # Calculate spent amount
        query = Expense.query.filter_by(user_id=current_user_id)
        
        # Category filter only — month filtering is done in Python below (handles both string and datetime dates)
        if b.category_id:
            try:
                query = query.filter_by(category_id=b.category_id)
                cat = Category.query.get(b.category_id)
                cat_name = cat.name if cat else "Unknown"
            except Exception:
                cat_name = "Unknown"
        else:
            cat_name = "Overall"
            
        expenses = query.all()
        # manual filter for month to be safe
        def get_month_str(d):
            if isinstance(d, datetime):
                return d.strftime('%Y-%m')
            elif isinstance(d, str):
                return d[:7]
            return ""
            
        spent = sum(e.total_amount for e in expenses if get_month_str(e.transaction_date) == month)
        
        result.append({
            "id": b.id,
            "category_id": b.category_id,
            "category_name": cat_name,
            "limit_amount": b.limit_amount,
            "spent_amount": spent,
            "month_year": b.month_year
        })
        
    return jsonify(result), 200

@budgets_bp.route('', methods=['POST'])
@jwt_required()
def create_budget():
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    month = data.get('month_year', datetime.now().strftime('%Y-%m'))
    
    # Check if exists
    existing = Budget.query.filter_by(
        user_id=current_user_id, 
        category_id=data.get('category_id'),
        month_year=month
    ).first()
    
    if existing:
        existing.limit_amount = data.get('limit_amount', existing.limit_amount)
        db.session.commit()
        return jsonify({"msg": "Budget updated"}), 200
        
    new_budget = Budget(
        user_id=current_user_id,
        category_id=data.get('category_id'),
        limit_amount=data.get('limit_amount', 0),
        month_year=month
    )
    db.session.add(new_budget)
    db.session.commit()
    
    return jsonify({"msg": "Budget created"}), 201

@budgets_bp.route('/<budget_id>', methods=['DELETE'])
@jwt_required()
def delete_budget(budget_id):
    current_user_id = get_jwt_identity()
    budget = Budget.query.filter_by(id=budget_id, user_id=current_user_id).first()
    
    if not budget:
        return jsonify({"msg": "Budget not found"}), 404
        
    db.session.delete(budget)
    db.session.commit()
    
    return jsonify({"msg": "Budget deleted"}), 200
