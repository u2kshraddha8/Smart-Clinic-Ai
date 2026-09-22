from flask import Flask, render_template, request, jsonify
import sqlite3
from datetime import date

app = Flask(__name__)

DATABASE = "database/clinic.db"


# =========================
# DATABASE INITIALIZATION
# =========================

def get_db_connection():
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def init_database():
    connection = get_db_connection()

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            age INTEGER NOT NULL,
            language TEXT NOT NULL,
            token INTEGER NOT NULL,
            date TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'waiting'
        )
        """
    )

    connection.commit()
    connection.close()


def get_today():
    return date.today().isoformat()


def parse_age(value):
    if value is None:
        raise ValueError("Age is required.")

    try:
        parsed = int(value)
        if parsed < 0 or parsed > 150:
            raise ValueError("Age must be between 0 and 150.")
        return parsed
    except (TypeError, ValueError):
        pass

    text = str(value).strip().lower()
    if not text:
        raise ValueError("Age is required.")

    number_words = {
        "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
        "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
        "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14,
        "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18,
        "nineteen": 19, "twenty": 20, "thirty": 30, "forty": 40,
        "fifty": 50, "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90
    }

    total = 0
    for word in text.replace("-", " ").split():
        if word in number_words:
            total += number_words[word]
        else:
            raise ValueError("Age could not be understood. Please say a valid age.")

    if total < 0 or total > 150:
        raise ValueError("Age must be between 0 and 150.")

    return total


# =========================
# HOME PAGE
# =========================

@app.route("/")
def home():
    return render_template("index.html")


@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")


# =========================
# PATIENT REGISTRATION
# =========================

@app.route("/register", methods=["POST"])
def register_patient():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"success": False, "message": "Request body must be a JSON object."}), 400

    name = (data.get("name") or "").strip()
    language = (data.get("language") or "").strip()

    if not name:
        return jsonify({"success": False, "message": "Name is required."}), 400

    if not language:
        return jsonify({"success": False, "message": "Language is required."}), 400

    try:
        age = parse_age(data.get("age"))
    except ValueError as exc:
        return jsonify({"success": False, "message": str(exc)}), 400

    today = get_today()
    connection = get_db_connection()

    try:
        result = connection.execute(
            """
            SELECT MAX(token)
            FROM patients
            WHERE date = ?
            """,
            (today,),
        ).fetchone()

        last_token = result[0] if result else None
        new_token = 1 if last_token is None else last_token + 1

        connection.execute(
            """
            INSERT INTO patients (name, age, language, token, date, status)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (name, age, language, new_token, today, "waiting"),
        )
        connection.commit()
    finally:
        connection.close()

    return jsonify({
        "success": True,
        "token": new_token,
        "name": name,
        "age": age,
        "language": language,
    })


# =========================
# GET TODAY'S QUEUE
# =========================

@app.route("/queue")
def get_queue():
    today = get_today()
    connection = get_db_connection()

    try:
        patients = connection.execute(
            """
            SELECT id, name, age, token, status
            FROM patients
            WHERE date = ?
            ORDER BY token ASC
            """,
            (today,),
        ).fetchall()
    finally:
        connection.close()

    return jsonify([dict(patient) for patient in patients])


@app.route("/call-next", methods=["POST"])
def call_next():
    today = get_today()
    connection = get_db_connection()

    try:
        connection.execute(
            """
            UPDATE patients
            SET status = 'done'
            WHERE date = ? AND status = 'serving'
            """,
            (today,),
        )

        patient = connection.execute(
            """
            SELECT id, name, token
            FROM patients
            WHERE date = ? AND status = 'waiting'
            ORDER BY token ASC
            LIMIT 1
            """,
            (today,),
        ).fetchone()

        if patient is None:
            connection.commit()
            return jsonify({
                "success": False,
                "message": "No patients waiting."
            })

        patient_id, name, token = patient

        connection.execute(
            """
            UPDATE patients
            SET status = 'serving'
            WHERE id = ?
            """,
            (patient_id,),
        )

        connection.commit()
        return jsonify({
            "success": True,
            "name": name,
            "token": token
        })
    finally:
        connection.close()


# =========================
# START APPLICATION
# =========================

if __name__ == "__main__":
    init_database()
    app.run(debug=True)