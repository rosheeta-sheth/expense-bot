from app import create_app
from models import db, Category

app = create_app()

pre_defined = [
    "Groceries",
    "Restaurants & Dining",
    "Transportation",
    "Utilities",
    "Entertainment",
    "Shopping",
    "Electronics",
    "Healthcare & Medical",
    "Insurance",
    "Travel & Lodging",
    "Education",
    "Subscriptions",
    "Personal Care",
    "Pet Expenses",
    "Home & Garden",
    "Sports & Fitness",
    "Donations & Charity",
    "Other"
]

with app.app_context():
    # Only insert if empty
    if Category.query.filter_by(user_id=None).count() == 0:
        for cat in pre_defined:
            new_cat = Category(name=cat, user_id=None)
            db.session.add(new_cat)
        db.session.commit()
        print("Pre-defined categories seeded successfully.")
    else:
        print("Categories already exist, skipping seed.")
