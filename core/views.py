from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login as auth_login
from django.contrib.auth.decorators import login_required
def homepage(request):
    return render(request, "pages/homepage.html")
def inventory(request):
    return render(request, "pages/inventory.html")
def library(request):
    return render(request, "pages/library.html")
def calendar(request):
    return render(request, "pages/calendar.html")
def shoppinglist(request):
    return render(request, "pages/shoppinglist.html")
def profile(request):
    return render(request, "pages/profile.html")    
def generatedmeals(request):
    return render(request, "pages/generatedmeals.html") 
def login_view(request):
    if request.method == "POST" :
        email = request.POST.get("email")
        password = request.POST.get ("password")
        user = authenticate(request, username = email, password = password)
        if user is not None: 
            auth_login(request, user)
            return redirect("homepage")
    return render(request, "pages/login.html") 
def signup(request):
    return render(request, "pages/signup.html") 
