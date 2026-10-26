from django.contrib import admin

from .models import FavouriteRecipe, RecipeCache

admin.site.register(RecipeCache)
admin.site.register(FavouriteRecipe)
