from django.db import IntegrityError, transaction
from django.http import Http404
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from meal_hacker.api_errors import api_error

from . import services, spoonacular
from .models import FavouriteRecipe
from .normalise import summary_from_api
from .serializers import FavouriteSerializer

UNAVAILABLE = ("recipes_unavailable", "Recipes can't load right now. Try again in a minute.", 503)
NOT_FOUND = ("not_found", "We couldn't find that recipe.", 404)


def _respond(data, stale: bool) -> Response:
    resp = Response(data)
    if stale:
        resp["X-Stale"] = "true"
    return resp


@api_view(["GET"])
def suggestions(request):
    try:
        results, stale, reason = services.suggestions(request.user)
    except spoonacular.SpoonacularUnavailable:
        return api_error(*UNAVAILABLE)
    return _respond({"results": results, "reason": reason}, stale)


@api_view(["GET"])
def search(request):
    q = request.query_params
    try:
        results, stale = services.search(
            request.user, q.get("q", "").strip()[:100], q.get("cuisine", ""), q.get("type", ""),
            q.get("diet", ""), q.get("matches_kitchen") in ("1", "true"))
    except spoonacular.SpoonacularUnavailable:
        return api_error(*UNAVAILABLE)
    return _respond({"results": results}, stale)


@api_view(["GET"])
def detail(request, recipe_id):
    if recipe_id < 1:
        raise Http404
    try:
        data, stale = services.recipe_detail(request.user, recipe_id)
    except spoonacular.RecipeNotFound:
        return api_error(*NOT_FOUND)
    except spoonacular.SpoonacularUnavailable:
        return api_error(*UNAVAILABLE)
    return _respond(data, stale)


@api_view(["GET", "POST"])
def favourites(request):
    if request.method == "GET":
        return Response(FavouriteSerializer(FavouriteRecipe.objects.filter(user=request.user), many=True).data)
    s = FavouriteSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    recipe_id = s.validated_data["recipe_id"]
    existing = FavouriteRecipe.objects.filter(user=request.user, recipe_id=recipe_id).first()
    if existing:
        return Response(FavouriteSerializer(existing).data, status=status.HTTP_200_OK)
    try:
        info = spoonacular.information(recipe_id).data
    except spoonacular.RecipeNotFound:
        return api_error(*NOT_FOUND)
    except spoonacular.SpoonacularUnavailable:
        return api_error(*UNAVAILABLE)
    summary = summary_from_api(info, set())
    try:
        with transaction.atomic():
            fav = FavouriteRecipe.objects.create(
                user=request.user, recipe_id=recipe_id, title=summary["title"][:200],
                image=summary["image"], description=summary["description"][:300])
    except IntegrityError:  # concurrent double-tap: the other request won
        fav = FavouriteRecipe.objects.get(user=request.user, recipe_id=recipe_id)
        return Response(FavouriteSerializer(fav).data, status=status.HTTP_200_OK)
    return Response(FavouriteSerializer(fav).data, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
def favourite_detail(request, recipe_id):
    deleted, _ = FavouriteRecipe.objects.filter(user=request.user, recipe_id=recipe_id).delete()
    if not deleted:
        raise Http404
    return Response(status=status.HTTP_204_NO_CONTENT)
