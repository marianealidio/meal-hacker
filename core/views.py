from django.shortcuts import render

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