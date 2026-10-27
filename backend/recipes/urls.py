from django.urls import path

from . import views

urlpatterns = [
    path("recipes/suggestions/", views.suggestions, name="api-suggestions"),
    path("recipes/search/", views.search, name="api-search"),
    path("recipes/<int:recipe_id>/", views.detail, name="api-recipe"),
    path("favourites/", views.favourites, name="api-favourites"),
    path("favourites/<int:recipe_id>/", views.favourite_detail, name="api-favourite"),
]
