from django.contrib import admin

from .models import InventoryItem, Note

admin.site.register(InventoryItem)
admin.site.register(Note)
