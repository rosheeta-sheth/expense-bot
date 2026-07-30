from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone

from models import db, Expense, LineItem, Category

expenses_bp = Blueprint('expenses', __name__)

def parse_date(d):
    """Safely parse a transaction_date whether it's a datetime object or ISO string."""
    if isinstance(d, datetime):
        return d
    if isinstance(d, str):
        try:
            return datetime.fromisoformat(d.replace('Z', '+00:00'))
        except Exception:
            return datetime.now()
    return datetime.now()

@expenses_bp.route('', methods=['POST'])
@jwt_required()
def create_expense():
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    # Create the expense record
    new_expense = Expense(
        user_id=current_user_id,
        merchant_name=data.get('merchant_name', 'Unknown Merchant'),
        total_amount=data.get('total_amount', 0),
        tax_amount=data.get('tax_amount', 0),
        transaction_date=datetime.fromisoformat(data.get('transaction_date', datetime.now().isoformat())),
        category_id=data.get('category_id'),
        payment_method=data.get('payment_method'),
        notes=data.get('notes'),
        receipt_image_url=data.get('receipt_image_url'),
        ai_confidence_score=data.get('ai_confidence_score'),
        manually_added=data.get('manually_added', False)
    )
    
    db.session.add(new_expense)
    db.session.flush() # Get the expense ID
    
    # Create line items if provided
    items = data.get('items', [])
    for item in items:
        new_item = LineItem(
            expense_id=new_expense.id,
            product_name=item.get('product_name'),
            quantity=item.get('quantity', 1),
            unit_price=item.get('unit_price'),
            total_price=item.get('total_price'),
            category_id=item.get('category_id') # New feature!
        )
        db.session.add(new_item)
        
    db.session.commit()
    
    return jsonify({"msg": "Expense created", "expense_id": new_expense.id}), 201

@expenses_bp.route('', methods=['GET'])
@jwt_required()
def list_expenses():
    current_user_id = get_jwt_identity()
    
    # Simple filtering
    query = Expense.query.filter_by(user_id=current_user_id)
    
    category_id = request.args.get('category_id')
    if category_id:
        query = query.filter_by(category_id=category_id)
        
    # Sort by date descending
    expenses = query.order_by(Expense.transaction_date.desc()).all()
    
    result = []
    for exp in expenses:
        cat_name = None
        if exp.category_id:
            cat = Category.query.get(exp.category_id)
            if cat:
                cat_name = cat.name
                
        d = parse_date(exp.transaction_date)
        result.append({
            "id": exp.id,
            "merchant_name": exp.merchant_name,
            "total_amount": exp.total_amount,
            "transaction_date": d.isoformat(),
            "category_id": exp.category_id,
            "category_name": cat_name,
            "payment_method": exp.payment_method
        })
        
    return jsonify(result), 200

@expenses_bp.route('/<expense_id>', methods=['GET'])
@jwt_required()
def get_expense(expense_id):
    current_user_id = get_jwt_identity()
    exp = Expense.query.filter_by(id=expense_id, user_id=current_user_id).first()
    
    if not exp:
        return jsonify({"msg": "Expense not found"}), 404
        
    items = LineItem.query.filter_by(expense_id=exp.id).all()
    items_list = [{"product_name": i.product_name, "quantity": i.quantity, "unit_price": i.unit_price, "total_price": i.total_price, "category_id": i.category_id} for i in items]
    
    return jsonify({
        "id": exp.id,
        "merchant_name": exp.merchant_name,
        "total_amount": exp.total_amount,
        "tax_amount": exp.tax_amount,
        "transaction_date": parse_date(exp.transaction_date).isoformat(),
        "category_id": exp.category_id,
        "payment_method": exp.payment_method,
        "notes": exp.notes,
        "receipt_image_url": exp.receipt_image_url,
        "items": items_list
    }), 200

@expenses_bp.route('/<expense_id>', methods=['PUT'])
@jwt_required()
def update_expense(expense_id):
    current_user_id = get_jwt_identity()
    exp = Expense.query.filter_by(id=expense_id, user_id=current_user_id).first()
    
    if not exp:
        return jsonify({"msg": "Expense not found"}), 404
        
    data = request.get_json()
    
    # Update fields
    if 'merchant_name' in data: exp.merchant_name = data['merchant_name']
    if 'total_amount' in data: exp.total_amount = data['total_amount']
    if 'tax_amount' in data: exp.tax_amount = data['tax_amount']
    if 'category_id' in data: exp.category_id = data['category_id']
    if 'payment_method' in data: exp.payment_method = data['payment_method']
    if 'notes' in data: exp.notes = data['notes']
    if 'transaction_date' in data: 
        exp.transaction_date = datetime.fromisoformat(data['transaction_date'].replace('Z', '+00:00'))
        
    # Handle LineItems (replace all)
    if 'items' in data:
        LineItem.query.filter_by(expense_id=exp.id).delete()
        for item in data['items']:
            new_item = LineItem(
                expense_id=exp.id,
                product_name=item.get('product_name'),
                quantity=item.get('quantity', 1),
                unit_price=item.get('unit_price'),
                total_price=item.get('total_price'),
                category_id=item.get('category_id')
            )
            db.session.add(new_item)
            
    db.session.commit()
    return jsonify({"msg": "Expense updated"}), 200

@expenses_bp.route('/<expense_id>', methods=['DELETE'])
@jwt_required()
def delete_expense(expense_id):
    current_user_id = get_jwt_identity()
    exp = Expense.query.filter_by(id=expense_id, user_id=current_user_id).first()
    
    if not exp:
        return jsonify({"msg": "Expense not found"}), 404
        
    db.session.delete(exp)
    db.session.commit()
    return jsonify({"msg": "Expense deleted"}), 200

@expenses_bp.route('/analytics', methods=['GET'])
@jwt_required()
def get_analytics():
    current_user_id = get_jwt_identity()
    expenses = Expense.query.filter_by(user_id=current_user_id).order_by(Expense.transaction_date.asc()).all()
    
    total_spending = sum(e.total_amount for e in expenses)
    transaction_count = len(expenses)
    
    # 1. Trend Data (Group by Month)
    trend_map = {}
    for e in expenses:
        d = parse_date(e.transaction_date)
        month = d.strftime('%Y-%m')
        trend_map[month] = trend_map.get(month, 0) + (e.total_amount / 100)
    
    trend_data = [{"date": k, "amount": round(v, 2)} for k, v in trend_map.items()]
    
    # 2. Anomaly Detection (Simple statistical mock: flagging items > mean + 1.5 * stddev)
    anomalies = []
    if transaction_count > 2:
        amounts = [e.total_amount for e in expenses]
        mean = sum(amounts) / len(amounts)
        variance = sum((x - mean) ** 2 for x in amounts) / len(amounts)
        stddev = variance ** 0.5
        threshold = mean + (1.5 * stddev)
        
        for e in expenses:
            if e.total_amount > threshold and e.total_amount > 5000: # at least $50 to care
                d = parse_date(e.transaction_date)
                anomalies.append({
                    "id": e.id,
                    "merchant": e.merchant_name,
                    "amount": e.total_amount / 100,
                    "date": d.strftime('%Y-%m-%d')
                })
                
    # 3. Forecast (Extrapolate current month based on day of month)
    current_day = datetime.now().day
    days_in_month = 30 # Approximation
    now_month = datetime.now().month
    current_month_spending = sum(e.total_amount for e in expenses if parse_date(e.transaction_date).month == now_month)
    forecast = (current_month_spending / current_day) * days_in_month if current_day > 0 else 0
    
    return jsonify({
        "total_spending": total_spending,
        "transaction_count": transaction_count,
        "average_transaction": (total_spending / transaction_count) if transaction_count > 0 else 0,
        "trend_data": trend_data,
        "anomalies": anomalies,
        "forecast": forecast
    }), 200
