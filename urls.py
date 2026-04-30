from django.urls import path
from . import views
urlpatterns = [

    #Main website routes
    path("", views.homepage, name = "homepage"),
    path("inventory/",views.inventory, name = "inventory"),
    path("library/",views.library, name = "library"),
    path("calendar/",views.calendar, name = "calendar"),
    path("shoppinglist/",views.shoppinglist, name = "shoppinglist"),
    path("profile/",views.profile, name = "profile"),

    #User authentication routes
    path("login/",views.login_view, name = "login"),
    path("signup/",views.signup_view, name = "signup"),
    path("logout/",views.logout_view, name = "logout"),

    #Recipe and chatbot features route
    path("generatedmeals/",views.generatedmeals, name = "generatedmeals"),
    path("recipe-detail/<int:recipe_id>/",views.recipe_detail, name="recipe_detail"),
    path('chatbot/', views.chatbot, name='chatbot'),

    #Actions for deleting,saving,adding data 
    path("delete-item/<int:item_id>/",views.delete_item_view, name="delete_item"),
    path("remove-meal/<int:plan_id>/",views.remove_meal_view, name="remove_meal"),
    path("delete-shopping-item/<int:item_id>/",views.delete_shopping_item_view, name="delete_shopping_item"),
    path('save-reminders/', views.save_reminders, name='save_reminders'),
    path('add-to-calendar/', views.add_to_calendar, name='add_to_calendar'),

]