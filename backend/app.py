import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from models import db
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def create_app():
    app = Flask(__name__)
    
    # Configure app
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-please-change')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///expense_bot.db') # Fallback to sqlite for instant dev
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-please-change')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 3600 * 24 # 1 day
    
    # Initialize extensions
    CORS(app)
    db.init_app(app)
    jwt = JWTManager(app)
    
    # Register blueprints (routes will be imported here)
    from routes.auth import auth_bp
    from routes.expenses import expenses_bp
    from routes.categories import categories_bp
    from routes.receipts import receipts_bp
    from routes.budgets import budgets_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(expenses_bp, url_prefix='/api/expenses')
    app.register_blueprint(categories_bp, url_prefix='/api/categories')
    app.register_blueprint(receipts_bp, url_prefix='/api/receipts')
    app.register_blueprint(budgets_bp, url_prefix='/api/budgets')
    
    @app.route('/api/health')
    def health_check():
        return {'status': 'ok'}
        
    # Create tables and auto-seed categories
    with app.app_context():
        db.create_all()
        
        from models import Category
        pre_defined = ["Groceries", "Restaurants & Dining", "Transportation", "Utilities", "Entertainment", "Shopping", "Electronics", "Healthcare & Medical", "Insurance", "Travel & Lodging", "Education", "Subscriptions", "Personal Care", "Pet Expenses", "Home & Garden", "Sports & Fitness", "Donations & Charity", "Other"]
        for cat in pre_defined:
            if not Category.query.filter_by(name=cat, user_id=None).first():
                db.session.add(Category(name=cat, user_id=None))
        db.session.commit()
        
    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, port=5001)
