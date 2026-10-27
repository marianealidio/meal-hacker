from django.urls import path

from . import views

urlpatterns = [
    path("inventory/", views.InventoryList.as_view(), name="api-inventory"),
    path("inventory/<int:pk>/", views.InventoryDetail.as_view(), name="api-inventory-detail"),
    path("inventory/<int:pk>/use/", views.use_item, name="api-inventory-use"),
    path("note/", views.note, name="api-note"),
]
