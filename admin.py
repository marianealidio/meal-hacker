from django.contrib import admin
from .models import InventoryItem, MealPlan, ShoppingListItem,Reminder

#Allows inventory item, planned meals,shopping list and reminder to be viewed on admin panel
admin.site.register(InventoryItem)
admin.site.register(MealPlan)
admin.site.register(ShoppingListItem)
admin.site.register(Reminder)