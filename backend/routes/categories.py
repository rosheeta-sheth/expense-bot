from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Category

categories_bp = Blueprint('categories', __name__)

@categories_bp.route('', methods=['GET'])
@jwt_required()
def get_categories():
    current_user_id = get_jwt_identity()
    
    # Get pre-defined categories (user_id is None) and user's custom categories
    categories = Category.query.filter(
        (Category.user_id.is_(None)) | (Category.user_id == current_user_id)
    ).all()
    
    result = []
    for cat in categories:
        result.append({
            "id": cat.id,
            "name": cat.name,
            "icon": cat.icon,
            "color": cat.color,
            "is_custom": cat.is_custom,
            "is_active": cat.is_active
        })
        
    return jsonify(result), 200

@categories_bp.route('', methods=['POST'])
@jwt_required()
def create_category():
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    name = data.get('name')
    if not name:
        return jsonify({"msg": "Category name is required"}), 400
        
    new_cat = Category(
        user_id=current_user_id,
        name=name,
        icon=data.get('icon'),
        color=data.get('color'),
        is_custom=True
    )
    
    db.session.add(new_cat)
    db.session.commit()
    
    return jsonify({
        "msg": "Category created",
        "category": {
            "id": new_cat.id,
            "name": new_cat.name,
            "icon": new_cat.icon,
            "color": new_cat.color,
            "is_custom": new_cat.is_custom
        }
    }), 201

@categories_bp.route('/<category_id>', methods=['DELETE'])
@jwt_required()
def delete_category(category_id):
    current_user_id = get_jwt_identity()
    
    category = Category.query.filter_by(id=category_id, user_id=current_user_id).first()
    if not category:
        return jsonify({"msg": "Category not found or you do not have permission to delete it"}), 404
        
    # Soft delete or hard delete? Let's just set is_active=False
    category.is_active = False
    db.session.commit()
    
    return jsonify({"msg": "Category deleted"}), 200
