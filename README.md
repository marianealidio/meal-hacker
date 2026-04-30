#  Meal Hacker
**Smart Meal Planner and Inventory Manager**

BSc Computer Science Final Year Project — Mariane Alidio (w19740405)
Supervisor: Qasim Abbas — University of Westminster, 2026

Meal Hacker is a Django web application that helps reduce food waste and simplify daily meal planning. Add your kitchen ingredients, get recipe suggestions based on what you own, plan your week on a calendar, and auto-generate a shopping list for anything you are missing.

---

## Before you start

Make sure you have the following installed:

- **Python 3.8 or higher** — [python.org/downloads](https://www.python.org/downloads/)
- **Git** — [git-scm.com](https://git-scm.com/)

To check Python is installed, open a terminal and run:
```
python --version
```
If that does not work, try `python3 --version`

---

## Important — `.env` file

The project folder already contains an empty `.env` file. **You must paste the API keys uploaded in blackboard into it before running the project**, otherwise the app will not start.

Open the `.env` file in any text editor (Notepad, VS Code, TextEdit) and paste the four lines uploaded in blackboard, then save

> The `.env` file is in the same folder as `manage.py`. Do not rename it or move it.

---
## Setup — Mac

**1. Download zip from github using the green button**
Download zip 
Navigate to meal-hacker
```
cd meal-hacker
```
Open **Terminal** and run these commands one at a time:

**2. Create a virtual environment**
```
python3 -m venv venv
```

**3. Activate the virtual environment**
```
source venv/bin/activate
```
You will see `(venv)` at the start of the terminal line — keep this active for all remaining steps.

**4. Install dependencies**
```
pip install django==4.2.27 requests python-decouple
```

**5. Paste the API keys into the `.env` file**

Open the `.env` file (already in the project folder) in any text editor and paste the four lines shown in the section above. Save the file.

**6. Set up the database**
```
python3 manage.py migrate
```

**7. Run the server**
```
python3 manage.py runserver
```

**8. Open the website**
```
http://127.0.0.1:8000/
```

---
## Setup — Windows

**1. Download zip from github using the green button**
Download zip 
Navigate to meal-hacker
```
cd meal-hacker
```
Open **Terminal** and run these commands one at a time:

**2. Create a virtual environment**
```
python -m venv venv
```

**3. Activate the virtual environment**
```
venv\Scripts\activate
```
You will see `(venv)` at the start of the terminal line — keep this active for all remaining steps.

**4. Install dependencies**
```
pip install django==4.2.27 requests python-decouple
```

**5. Paste the API keys into the `.env` file**

Open the `.env` file (already in the project folder) in Notepad and paste the four lines shown in the section above. Save the file.

**6. Set up the database**
```
python manage.py migrate
```

**7. Run the server**
```
python manage.py runserver
```

**8. Open the website**
```
http://127.0.0.1:8000/
```

---


## Using the website

1. Click **Sign Up** to create an account
2. Go to **Inventory** and add at least 3 ingredients (e.g. chicken, garlic, onion) — choose a category (Pantry / Fridge / Freezer) and optionally set an expiry date
3. Go to **Meal Ideas** to see recipe suggestions based on your inventory
4. Visit the **Library** to browse recipes, filter by cuisine or diet, and add meals to your calendar
5. The **Homepage** shows your best meal suggestion of the day, expiring items, a notes section, and an AI kitchen chatbot
6. The **Calendar** shows your planned meals for the current week
7. The **Shopping List** collects missing ingredients automatically when you add meals from the Library, or add items manually

---

## API notes

| API | Purpose | Limit |
|-----|---------|-------|
| Spoonacular | Recipe suggestions, library, meal details | 50 points / day |
| Groq (LLaMA 3.1) | AI kitchen chatbot | Free tier |

If the Spoonacular daily limit is reached, recipe pages will show a fallback message.Please try again the following day.

---

## Troubleshooting

**App crashes on `migrate` with `SECRET_KEY not found`**
The `.env` file has not been filled in yet. Open it and paste the four lines from the section above.

**`python` command not found on Mac**
Use `python3` instead of `python` for all commands.

**Port already in use**
```
python manage.py runserver 8080
```
Then open `http://127.0.0.1:8080/`

---

*Mariane Alidio · w19740405 · BSc (Hons) Computer Science · University of Westminster · 2026*
