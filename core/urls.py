from django.urls import path
from . import views
urlpatterns = [
    path("", views.homepage, name = "homepage"),
    path("inventory/",views.inventory, name = "inventory"),
    path("library/",views.library, name = "library"),
    path("calendar/",views.calendar, name = "calendar"),
    path("shoppinglist/",views.shoppinglist, name = "shoppinglist"),
    path("profile/",views.profile, name = "profile"),
    path("login/",views.login_view, name = "login"),
    path("signup/",views.signup_view, name = "signup"),
    path("logout/",views.logout_view, name = "logout"),
    path("generatedmeals/",views.generatedmeals, name = "generatedmeals"),
    path("delete-item/<int:item_id>/",views.delete_item_view, name="delete_item"),
    path("remove-meal/<int:plan_id>/",views.remove_meal_view, name="remove_meal"),
    path("mark-purchased/<int:item_id>/",views.mark_purchased_view, name="mark_purchased"),
    path("delete-shopping-item/<int:item_id>/",views.delete_shopping_item_view, name="delete_shopping_item")
    ]
