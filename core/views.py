from django.shortcuts import render, redirect , get_object_or_404
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from .models import InventoryItem, MealPlan, ShoppingListItem,Reminder
import requests
from django.conf import settings
from datetime import date, timedelta


#Homepage shows the best meal suggestion, expiring items, notes and chatbot response
@login_required
def homepage(request):
    today = date.today()
    warn = today + timedelta(days=3)

    #Gets all inventory items of the user
    all_items = InventoryItem.objects.filter(user = request.user)

    #Filters items that expire from today up to next 3 days
    expiring_items = all_items.filter(
        expiry_date__lte = warn,
        expiry_date__gte =today
    )
    best_meal = None

    #Calls Spoonacular only when the user has enough inventory items
    if all_items.count() >= 3:

        #Convert the user's inventory item names to a comma-separated string for the API 
        ingredients = ','.join([
            item.name 
            for item in all_items
            ])

        try:
            resp = requests.get(
                'https://api.spoonacular.com/recipes/findByIngredients',
                params = {
                    'apiKey': settings.SPOONACULAR_API_KEY,
                    'ingredients': ingredients,
                    'number': 1,
                    'ranking': 1,
                    'ignorePantry': True,
                },
                timeout = 10
            )
            resp.raise_for_status()
            data = resp.json()

            #Takes the best meal suggestion to display on homepage
            if data:
                best_meal = data[0]
        except Exception:
            best_meal = None
    reminder, _ = Reminder.objects.get_or_create(user=request.user)

    chat_reply = request.session.pop('chat_reply','')
    chat_question = request.session.pop('chat_question','')

    return render(request, 'pages/homepage.html', {
        'best_meal': best_meal,
        'expiring_items': expiring_items,
        'reminder_note': reminder.note,
        'chat_reply': chat_reply,
        'chat_question': chat_question,

    })

#Saves the user's homepage note/reminder
@login_required   
def save_reminders(request):
    if request.method == 'POST':
        reminder, _ =Reminder.objects.get_or_create(user = request.user)
        reminder.note = request.POST.get ('note','')
        reminder.save()       
    return redirect ('homepage')


#Displays inventory items and handles adding new ingredients
@login_required   
def inventory(request):
    if request.method == 'POST':
        name = request.POST.get('name','').strip()
        if name:
            InventoryItem.objects.create(
                user = request.user,
                name = name,
                quantity = request.POST.get('quantity', ''),
                category = request.POST.get('category', 'Fridge'),
                expiry_date = request.POST.get('expiry_date') or None
            )
        return redirect('inventory')
    items = InventoryItem.objects.filter(user = request.user).order_by('expiry_date')
    pantry = items.filter(category = 'Pantry')
    fridge = items.filter(category = 'Fridge')
    freezer = items.filter(category = 'Freezer')

    return render(request, 'pages/inventory.html', {
        'pantry': pantry,
        'fridge': fridge,
        'freezer': freezer

    })

#Displays the current week's planned meal 
@login_required
def calendar(request):
    today = date.today()

    #Find the monday of the current week
    start = today - timedelta(days=today.weekday())
    #Create a list of 7 dates for the weekly calendar 
    week = [start + timedelta(days=i) for i in range(7)]
    plans = MealPlan.objects.filter(user=request.user, planned_date__in=week)
    #Matches each date with any meals planned for that day
    days = [{
        'date': d, 'meals': plans.filter(planned_date=d)} for d in week]

    return render(request, "pages/calendar.html", {'days': days , 'today': today})

#Displays and adds manual shopping list items
@login_required
def shoppinglist(request):
    if request.method == 'POST' and 'add_item' in request.POST:
        ShoppingListItem.objects.create(
            user=request.user,
            ingredient_name=request.POST.get('ingredient_name', '').strip(),
            quantity=request.POST.get('quantity', ''),
            source='manual'
        )
        return redirect('shoppinglist')

    items = ShoppingListItem.objects.filter(user=request.user)
    return render(request, 'pages/shoppinglist.html', {
        'items': items
    })

#Displays the logged-in user's account page
@login_required
def profile(request):
    return render(request, "pages/profile.html", {
        'user' :request.user
    })   

#Handles user login
def login_view(request):
    if request.user.is_authenticated:
        return redirect('homepage')
    form = AuthenticationForm()
    if request.method == "POST" :
        form = AuthenticationForm(data = request.POST)
        if form.is_valid():
            login(request, form.get_user())
            return redirect('homepage')
    return render(request, "pages/login.html", {'form': form}) 

#Log out the user and returns them to the log in page
def logout_view(request):
    logout(request)
    return redirect ('login')

#Handles user registration
def signup_view(request):
    form = UserCreationForm()
    if request.method == "POST" :
        form = UserCreationForm(request.POST) 
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect ('homepage')            
    return render(request, "pages/signup.html", {'form': form}) 

#Deletes an inventory item belonging to the current user
@login_required
def delete_item_view (request, item_id):
    item = get_object_or_404(InventoryItem, id = item_id, user = request.user)
    item.delete()
    return redirect('inventory')

#Removes a planned meal from the current user's calendar 
@login_required
def remove_meal_view(request, plan_id):
    get_object_or_404(MealPlan, id = plan_id, user = request.user).delete()
    return redirect('calendar')

#Deletes a shopping list item 
@login_required
def delete_shopping_item_view(request, item_id):
    get_object_or_404(ShoppingListItem, id = item_id, user = request.user).delete()
    return redirect('shoppinglist')

#Generates meal suggestions based on the user's inventory items
@login_required
def generatedmeals(request):
    items = InventoryItem.objects.filter(user=request.user)
    if items.count() < 3:
        return render (request, 'pages/generatedmeals.html', {
            'error': 'Add at least 3 ingredients to your inventory first.'
        })

    #Common pantry ingredients
    ignore_ingredients = {'water','salt','pepper'}
    #List of useful ingredients
    ingredient_names = []

    #Removes common pantry items before sending to Spoonacular
    for item in items:
        name = item.name.strip().lower()

        if name and name not in ignore_ingredients:
            ingredient_names.append(name)

    #Ask the user to add more if ingredients are not enough
    if len(ingredient_names) < 2:
        return render(request, 'pages/generatedmeals.html', { 
            'error': 'Add more main ingredients to get better meal ideas.'
        })

    ingredients = ',' .join(ingredient_names)
    try: 
        resp = requests.get(
            'https://api.spoonacular.com/recipes/findByIngredients',
            params = {
                'apiKey': settings.SPOONACULAR_API_KEY,
                'ingredients': ingredients,
                'number': 10,
                'ranking': 1,
                'ignorePantry': True
            },
            timeout = 10 
        )   
        resp.raise_for_status()
        #Converts the API response into python data
        meals = resp.json()
        
        #Keeps meals that use at least two ingredients from the user's inventory
        meals = [ 
            meal for meal in meals 
            if len(meal.get('usedIngredients', [])) >=2
        ]
        #Sort meals by more used ingredients and fewer missing ingredients
        meals = sorted(
            meals,
            key = lambda meal: (
                len(meal.get('usedIngredients',[])),
                -len(meal.get('missedIngredients', []))
            ),
            reverse = True
        ) [:3]
    except Exception:
        meals = []
        return render (request, 'pages/generatedmeals.html', {
            'error': "Could not load suggestions right now. The API may have reached its credit limit."
        })
    return render(request, 'pages/generatedmeals.html',
    {'meals':meals
    })

#Displays the recipe library and applies user-selected filters
@login_required
def library(request):

    user_ingredients = set(
           InventoryItem.objects.filter(user = request.user).values_list('name', flat =True)
        )
    user_ingredients = {name.lower() for name in user_ingredients}

    #Builds the Spoonacular search filters from the form values
    params = {
        'apiKey': settings.SPOONACULAR_API_KEY,
        'number': 20,
        'addRecipeInformation': True,
        'fillIngredients': True,
        'cuisine': request.GET.get('cuisine', ''),
            'diet': request.GET.get('diet',''),
            'type': request.GET.get('type',''),
            'query': request.GET.get('query',''),
            'includeIngredients': request.GET.get('includeIngredients',''),
            
    }
    #Removes empty filter values 
    params = {k: v for k, v in params.items() if v}
    recipes = []
    error = None
    try:
        resp = requests.get(
            'https://api.spoonacular.com/recipes/complexSearch',
            params=params,
            timeout = 10
      )
        resp.raise_for_status()
        recipes = resp.json().get('results', [])
    except Exception:
        error = 'Could not load suggestions right now. The API may have reached its credit limit.'


    #Compares each recipe's ingredients with the user's inventory.
    #Use i.get('name') so a partial API ingredient (no 'name' key) can't
    #raise a KeyError and 500 the page.
    for recipe in recipes:
        ings = recipe.get('extendedIngredients', [])
        recipe['have'] = [i for i in ings if (i.get('name') or '').lower() in user_ingredients]
        recipe['missing'] = [i for i in ings if (i.get('name') or '').lower() not in user_ingredients]
    return render(request, 'pages/library.html', {'recipes': recipes, 'error':error })

#Adds a selected recipe to the calendar and missing ingredients to the shopping list
@login_required
def add_to_calendar(request):
    if request.method == 'POST':

        #Save the selected meal to user's meal calendar
        MealPlan.objects.create(
            user=request.user,
            recipe_id=request.POST.get('recipe_id', 0),
            recipe_title=request.POST.get('recipe_title'),
            recipe_image=request.POST.get('recipe_image'),
            planned_date=request.POST.get('planned_date'),
        )
        #Adds missing ingredients to the user's shopping list
        for name in request.POST.getlist('ingredients'):
            ShoppingListItem.objects.create(
                user=request.user,
                ingredient_name=name,
                source='auto'
            )
    return redirect('calendar')

#Loads full recipe details from Spoonacular
@login_required
def recipe_detail(request, recipe_id):
    try:
        #Requests full recipe information using the recipe Id from the url
        resp = requests.get(
            f'https://api.spoonacular.com/recipes/{recipe_id}/information',
            params ={ 'apiKey': settings.SPOONACULAR_API_KEY},
            timeout=10
        )
        resp.raise_for_status()
        recipe = resp.json()
    except Exception:
        recipe = None
    return render(request, 'pages/recipe_detail.html', {'recipe':recipe })

#Sends the user's question to the kitchen assistant chatbot
@login_required 
def chatbot(request):
    if request.method == 'POST':

        #Gets the user's question from the form
        user_message = request.POST.get('message', '').strip()
        reply = "Sorry, I couldn't answer that. Please try again."
        try:
            #Sends the question to Groq
            resp = requests.post(
                'https://api.groq.com/openai/v1/chat/completions',
                headers = {
                    'Authorization': f'Bearer {settings.GROQ_API_KEY}',
                    'Content-Type' : 'application/json',
                },
                json ={ 
                    'model': 'llama-3.1-8b-instant',
                    'messages': [
                        {'role': 'system', 'content': 'You are a kitchen assistant. Only answer kitchen, food and cooking related questions. If not kitchen or food related do not answer.Keep answers short.'},
                        {'role': 'user', 'content': user_message}
                    ],
                    'max_tokens': 200,
                },
                timeout = 15
            )
            resp.raise_for_status()
            #Saves the chatbot reply 
            reply = resp.json()['choices'][0]['message']['content']
        except Exception as e:
            reply = 'Sorry, I could not answer right now. Please try again.'

        #Stores the question and answer temporarily in the session
        request.session['chat_reply'] = reply
        request.session['chat_question'] = user_message
            

    return redirect('homepage')
