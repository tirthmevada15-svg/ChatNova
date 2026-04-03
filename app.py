from flask import Flask, render_template, request, redirect, session, jsonify
from supabase import create_client
from groq import Groq
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
app.secret_key = "secret123"

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
client = Groq(api_key="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")

# ---------- HOME ----------
@app.route("/")
def home():
    if "user" in session:
        return render_template("index.html")
    return redirect("/login")

# ---------- LOGIN ----------
@app.route("/login", methods=["GET","POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email")
        password = request.form.get("password")

        try:
            res = supabase.auth.sign_in_with_password({
                "email": email,
                "password": password
            })

            if res.user:
                session["user"] = email
                return redirect("/")
            else:
                return "Invalid login"

        except Exception as e:
            error = str(e)

            if "Email not confirmed" in error:
                return "Please confirm your email before login."

            if "Invalid login credentials" in error:
                return "Wrong email or password."

            return f"Login error: {error}"

    return render_template("login.html")

# ---------- SIGNUP ----------
@app.route("/signup", methods=["GET","POST"])
def signup():
    if request.method == "POST":
        email = request.form.get("email")
        password = request.form.get("password")

        try:
            res = supabase.auth.sign_up({
                "email": email,
                "password": password
            })

            if res.user:
                return redirect("/login")
            else:
                return "Signup failed"

        except Exception as e:
            error = str(e)

            if "User already registered" in error:
                return "User already exists. Please login."

            return f"Signup error: {error}"

    return render_template("signup.html")

# ---------- LOGOUT ----------
@app.route("/logout")
def logout():
    session.clear()
    return redirect("/login")

# ---------- NEW CHAT ----------
@app.route("/new_chat", methods=["POST"])
def new_chat():
    try:
        user = session.get("user")

        res = supabase.table("conversations").insert({
            "user_email": user,
            "title": "New Chat"
        }).execute()

        return jsonify(res.data[0])

    except Exception as e:
        print("NEW CHAT ERROR:", e)
        return jsonify({"error": "Failed"}), 500

# ---------- GET CHATS ----------
@app.route("/get_conversations")
def get_conversations():
    user = session.get("user")

    res = supabase.table("conversations") \
        .select("*") \
        .eq("user_email", user) \
        .order("created_at", desc=True) \
        .execute()

    return jsonify(res.data)

# ---------- GET MESSAGES ----------
@app.route("/get_messages/<conv_id>")
def get_messages(conv_id):
    res = supabase.table("messages") \
        .select("*") \
        .eq("conversation_id", conv_id) \
        .order("created_at") \
        .execute()

    return jsonify(res.data)

# ---------- CHAT ----------
@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    message = data.get("message")
    conv_id = data.get("conversation_id")

    if not message:
        return jsonify({"response": "No message"})

    # save user message
    supabase.table("messages").insert({
        "conversation_id": conv_id,
        "role": "user",
        "content": message
    }).execute()

    # update title (first message)
    msgs = supabase.table("messages") \
        .select("*") \
        .eq("conversation_id", conv_id) \
        .execute()

    if len(msgs.data) <= 1:
        supabase.table("conversations") \
            .update({"title": message[:40]}) \
            .eq("id", conv_id) \
            .execute()

    # AI response
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role":"user","content":message}]
        )
        ai_text = response.choices[0].message.content

    except Exception as e:
        print("AI ERROR:", e)
        ai_text = "⚠️ AI not responding"

    # save AI message
    supabase.table("messages").insert({
        "conversation_id": conv_id,
        "role": "assistant",
        "content": ai_text
    }).execute()

    return jsonify({"response": ai_text})


if __name__ == "__main__":
    app.run(debug=True)
