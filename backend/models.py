from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone
import uuid

db = SQLAlchemy()

def generate_uuid():
    return str(uuid.uuid4())

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(100), nullable=True)
    default_currency = db.Column(db.String(3), default='USD')
    preferences = db.Column(db.JSON, default=dict)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    expenses = db.relationship('Expense', backref='user', lazy=True, cascade="all, delete-orphan")
    categories = db.relationship('Category', backref='user', lazy=True, cascade="all, delete-orphan")

class Category(db.Model):
    __tablename__ = 'categories'
    
    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=True) # Null for pre-defined
    name = db.Column(db.String(50), nullable=False)
    icon = db.Column(db.String(50), nullable=True)
    color = db.Column(db.String(20), nullable=True)
    is_custom = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

class Expense(db.Model):
    __tablename__ = 'expenses'
    
    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    merchant_name = db.Column(db.String(200), nullable=False)
    total_amount = db.Column(db.Integer, nullable=False) # Store in cents
    tax_amount = db.Column(db.Integer, nullable=True) # Store in cents
    transaction_date = db.Column(db.DateTime, nullable=False)
    category_id = db.Column(db.String, db.ForeignKey('categories.id'), nullable=True)
    payment_method = db.Column(db.String(50), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    receipt_image_url = db.Column(db.String, nullable=True)
    ai_confidence_score = db.Column(db.Float, nullable=True)
    manually_added = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    items = db.relationship('LineItem', backref='expense', lazy=True, cascade="all, delete-orphan")

class LineItem(db.Model):
    __tablename__ = 'line_items'
    
    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    expense_id = db.Column(db.String, db.ForeignKey('expenses.id'), nullable=False)
    product_name = db.Column(db.String(200), nullable=False)
    quantity = db.Column(db.Integer, default=1)
    unit_price = db.Column(db.Integer, nullable=True) # in cents
    total_price = db.Column(db.Integer, nullable=True) # in cents
    category_id = db.Column(db.String, db.ForeignKey('categories.id'), nullable=True)

class Budget(db.Model):
    __tablename__ = 'budgets'
    
    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    category_id = db.Column(db.String, db.ForeignKey('categories.id'), nullable=True) # Null means overall budget
    limit_amount = db.Column(db.Integer, nullable=False) # in cents
    month_year = db.Column(db.String(7), nullable=False) # e.g. "2026-07"
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
