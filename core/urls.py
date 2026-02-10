from django.urls import path
from . import views
urlpatterns = [
    path("", views.homepage, name = "homepage"),
    path("inventory/",views.inventory, name = "inventory"),
    path("library/",views.library, name = "library"),
    path("calendar/",views.calendar, name = "calendar"),
    path("shoppinglist/",views.shoppinglist, name = "shoppinglist"),
    ]