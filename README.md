# Smart Expense Tracker

A modern, full-stack personal finance web application that helps users track, categorize, and analyze their spending. The application allows users to upload receipts (via image upload or live camera), automatically extracts expense data using OCR and AI, suggests categorization, and provides comprehensive analytics.

## Key Features

- **Automated Receipt Processing:** Upload or snap photos of receipts. The system extracts merchant names, total amounts, taxes, dates, and itemized line items.
- **Smart Categorization:** Automatically categorizes expenses with a confidence score, learning from your spending habits.
- **Line-Item Review:** Review and edit extracted line items individually before saving.
- **Comprehensive Dashboard:** View your spending trends, top categories, and monthly forecasts via interactive charts.
- **Budget Management:** Set and track overall monthly budgets as well as category-specific limits.
- **Secure Authentication:** JWT-based authentication ensures your financial data remains private and secure.
- **Modern UI:** Built with a beautiful, responsive, and intuitive interface utilizing Glassmorphism and modern design principles.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Recharts
- **Backend:** Python, Flask, SQLAlchemy, JWT Authentication
- **Database:** SQLite (Development) / PostgreSQL (Production ready)

## Setup & Installation

### 1. Clone the repository
```bash
git clone <your-repository-url>
cd expense-bot
```

### 2. Backend Setup
Ensure you have Python 3.8+ installed.

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows, use `venv\Scripts\activate`

# Install dependencies
pip install -r requirements.txt

# Start the Flask server
python app.py
```
*The backend will run on `http://localhost:5001`.*

### 3. Frontend Setup
Ensure you have Node.js (v18+) installed.

```bash
# Open a new terminal window
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
*The frontend will be accessible at `http://localhost:5173`.*

## Usage Guide

1. **Register an Account:** Start by creating a secure account.
2. **Dashboard Overview:** Your dashboard will show you high-level statistics, spending trends, and budget warnings.
3. **Configure Budgets:** Navigate to **Settings** to set up your Overall Monthly Budget and Category-Specific Budgets.
4. **Log Expenses:**
   - Click **New Expense**.
   - **Upload Receipt:** Drag and drop an image of a receipt, or click "Take Photo" to use your device's camera.
   - **Manual Review:** The system will process the receipt and present the extracted data (Merchant, Total, Tax, Date, Payment Method, and Line Items) for your review.
   - **Save:** Once reviewed, save the expense to your database.
5. **Manage Expenses:** Navigate to the **Expenses** tab to view, edit, or delete past transactions.

## Required Dependencies

**Backend:**
- Flask
- Flask-SQLAlchemy
- Flask-CORS
- Flask-JWT-Extended
- Werkzeug

**Frontend:**
- React 18
- React Router DOM
- Axios
- Recharts
- Lucide React
- Tailwind CSS

## License
MIT License.
