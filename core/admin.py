from django.contrib import admin
from .models import InventoryItem, MealPlan, ShoppingListItem

admin.site.register(InventoryItem)
admin.site.register(MealPlan)
admin.site.register(ShoppingListItem)
