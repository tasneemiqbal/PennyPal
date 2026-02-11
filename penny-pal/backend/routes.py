from flask import Blueprint, request, jsonify
from backend.database import db
from backend.auth import get_user_from_token
from backend.models import Income, Expense, User, Budget, Goal
from datetime import datetime


routes = Blueprint('routes', __name__)

# Helper function to validate user
def validate_user():
    user = get_user_from_token()
    if not user:
        return None
    return user

# ----- INCOME ROUTES -----
@routes.route('/api/income', methods=['GET', 'POST'])
def handle_income():
    user = validate_user()
    if not user:
        return jsonify({'message': 'Unauthorized'}), 401

    if request.method == 'POST':
        data = request.get_json()
        if not data or 'income' not in data:
            return jsonify({'message': 'Income value is required'}), 400

        try:
            new_income = Income(
                user_id=user.id,
                source="User Input",
                amount=float(data['income']),
                date=datetime.utcnow()
            )
            db.session.add(new_income)
            db.session.commit()
            return jsonify({
                'message': 'Income saved successfully',
                'income': new_income.amount
            }), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'message': f'Error saving income: {str(e)}'}), 500

    elif request.method == 'GET':
        incomes = Income.query.filter_by(user_id=user.id).all()
        return jsonify([{
            'id': income.id,
            'amount': income.amount,
            'source': income.source,
            'date': income.date.strftime('%Y-%m-%d')
        } for income in incomes])

@routes.route('/api/income', methods=['DELETE'])
def delete_all_income():
    user = get_user_from_token()
    if not user:
        return jsonify({'message': 'Unauthorized'}), 401

    try:
        Income.query.filter_by(user_id=user.id).delete()
        db.session.commit()
        return jsonify({'message': 'All income deleted'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to delete income: {str(e)}'}), 500

@routes.route("/api/budget", methods=["GET", "POST"])
def handle_budget():
    user = get_user_from_token()
    if not user:
        return jsonify({"message": "Unauthorized"}), 401

    if request.method == "GET":
        budget = Budget.query.filter_by(user_id=user.id).first()
        return jsonify({"budget": budget.amount}) if budget else jsonify({"budget": None})

    data = request.get_json()
    amount = data.get("amount")
    if amount is None:
        return jsonify({"message": "Amount required"}), 400

    budget = Budget.query.filter_by(user_id=user.id).first()
    if budget:
        budget.amount = amount
    else:
        budget = Budget(amount=amount, user_id=user.id)
        db.session.add(budget)

    db.session.commit()
    return jsonify({"message": "Budget saved", "budget": amount})

@routes.route("/api/budget", methods=["DELETE"])
def delete_budget():
    user = get_user_from_token()
    if not user:
        return jsonify({"message": "Unauthorized"}), 401

    budget = Budget.query.filter_by(user_id=user.id).first()
    if budget:
        db.session.delete(budget)
        db.session.commit()
        return jsonify({"message": "Budget deleted"}), 200

    return jsonify({"message": "No budget found"}), 404
 


# ----- EXPENSE ROUTES -----
@routes.route('/api/expense', methods=['POST'])
def add_expense():
    user = validate_user()
    if not user:
        return jsonify({'message': 'Unauthorized'}), 401

    data = request.get_json()
    if not data or 'amount' not in data or 'category' not in data:
        return jsonify({'message': 'Amount and category are required'}), 400

    try:
        # Handle date parsing
        date_str = data.get('date')
        date_obj = datetime.utcnow()  # default to now
        
        if date_str:
            try:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            except ValueError:
                try:
                    date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                except ValueError:
                    return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400

        new_expense = Expense(
            user_id=user.id,
            amount=float(data['amount']),
            category=data['category'],
            date=date_obj
        )
        
        db.session.add(new_expense)
        db.session.commit()
        
        return jsonify({
            'id': new_expense.id,
            'amount': new_expense.amount,
            'category': new_expense.category,
            'date': new_expense.date.strftime('%Y-%m-%d'),
            'message': 'Expense added successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error adding expense: {str(e)}'}), 500

@routes.route('/api/expense/<username>', methods=['GET'])
def get_expenses(username):
    user = validate_user()
    if not user:
        return jsonify({'message': 'Unauthorized'}), 401

    # Verify requested user matches authenticated user
    if user.username != username:
        return jsonify({'message': 'Forbidden'}), 403

    expenses = Expense.query.filter_by(user_id=user.id).order_by(Expense.date.desc()).all()
    
    return jsonify([{
        'id': expense.id,
        'amount': expense.amount,
        'category': expense.category,
        'date': expense.date.strftime('%Y-%m-%d')
    } for expense in expenses])

@routes.route('/api/expense/<int:expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    user = get_user_from_token()
    if not user:
        return jsonify({'message': 'Unauthorized'}), 401

    expense = Expense.query.get(expense_id)

    if not expense or expense.user_id != user.id:
        return jsonify({'message': 'Expense not found or forbidden'}), 404

    try:
        db.session.delete(expense)
        db.session.commit()
        return jsonify({'message': 'Expense deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error deleting expense: {str(e)}'}), 500
    

# ----- BUDGET ROUTES -----
@routes.route('/api/budget', methods=['POST'])
def add_budget():
    user = validate_user()
    if not user:
        return jsonify({'message': 'Unauthorized'}), 401

    data = request.get_json()
    if not data or 'category' not in data or 'limit' not in data:
        return jsonify({'message': 'Category and limit are required'}), 400

    try:
        new_budget = Budget(
            user_id=user.id,
            category=data['category'],
            limit=float(data['limit'])
        )
        db.session.add(new_budget)
        db.session.commit()
        return jsonify({'message': 'Budget set successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error setting budget: {str(e)}'}), 500

# ----- ERROR HANDLER -----
@routes.errorhandler(404)
def not_found(e):
    return jsonify({'message': 'Resource not found'}), 404

@routes.errorhandler(405)
def method_not_allowed(e):
    return jsonify({'message': 'Method not allowed'}), 405


#---------GOAL---------------
@routes.route("/api/goal", methods=["POST"])
def handle_goal():
    data = request.get_json()

    user = User.query.first()  # Replace with real user logic
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Count existing goals
    existing_goals = Goal.query.filter_by(user_id=user.id).count()
    if existing_goals >= 2:
        return jsonify({"error": "You can only set up to 2 goals"}), 400

    description = data.get("description")
    target_amount = data.get("target_amount")

    if not description or not target_amount:
        return jsonify({"error": "Missing required fields"}), 400

    goal = Goal(
        user_id=user.id,
        description=description,
        target_amount=target_amount
    )
    db.session.add(goal)
    db.session.commit()

    return jsonify({
        "message": "Goal saved successfully",
        "description": goal.description,
        "target_amount": goal.target_amount
    }), 200


@routes.route("/api/goal", methods=["GET"])
def get_goals():
    user = User.query.first()  # Replace with real logic
    if not user:
        return jsonify({"error": "User not found"}), 404

    goals = Goal.query.filter_by(user_id=user.id).all()

    if not goals:
        return jsonify([]), 200

    total_expense = db.session.query(db.func.sum(Expense.amount))\
        .filter_by(user_id=user.id).scalar() or 0

    return jsonify([
        {
            "description": g.description,
            "target_amount": g.target_amount,
        } for g in goals
    ]), 200

@routes.route('/api/goal', methods=['DELETE'])
def delete_goal():
    user_id = 1  # Replace with actual logic to get logged-in user
    goal = Goal.query.filter_by(user_id=user_id).first()
    if not goal:
        return jsonify({'error': 'No goal found'}), 404

    db.session.delete(goal)
    db.session.commit()
    return jsonify({'message': 'Goal deleted'}), 200
