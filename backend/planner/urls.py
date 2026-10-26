from django.urls import path

from . import views

urlpatterns = [
    path("plans/", views.plans, name="api-plans"),
    path("plans/<int:pk>/", views.PlanDetail.as_view(), name="api-plan"),
    path("shopping/", views.ShoppingList.as_view(), name="api-shopping"),
    path("shopping/clear-checked/", views.clear_checked, name="api-shopping-clear"),
    path("shopping/<int:pk>/", views.ShoppingDetail.as_view(), name="api-shopping-item"),
    path("shopping/<int:pk>/to-inventory/", views.to_inventory, name="api-shopping-to-inventory"),
]
