from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from services.ai_services import process_receipt_image

receipts_bp = Blueprint('receipts', __name__)

@receipts_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_receipt():
    # Support multiple files for batch processing
    if 'receipts' not in request.files and 'receipt' not in request.files:
        return jsonify({"msg": "No file part"}), 400
        
    files = request.files.getlist('receipts')
    if not files and 'receipt' in request.files:
        files = request.files.getlist('receipt')
        
    if not files or files[0].filename == '':
        return jsonify({"msg": "No selected file"}), 400
        
    results = []
    for file in files:
        # In a real app, save to S3/GCS here.
        # file.save(secure_filename(file.filename))
        
        try:
            # Process the image via Mock AI
            res = process_receipt_image(file)
            # Append filename so the frontend knows which is which
            res['filename'] = file.filename
            results.append(res)
        except Exception as e:
            # Return a 500 JSON error gracefully instead of crashing the route
            return jsonify({"msg": f"AI Processing Error on {file.filename}: {str(e)}"}), 500

    return jsonify(results), 200
