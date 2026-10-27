from datetime import timedelta

from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response

from kitchen.models import InventoryItem
from planner.models import MealPlan


@api_view(["GET"])
def stats(request):
    today = timezone.localdate()
    month_start = today.replace(day=1)
    week_start = today - timedelta(days=today.weekday())
    mine = InventoryItem.objects.filter(user=request.user)
    active = mine.filter(used_at__isnull=True)
    return Response({
        "used_this_month": mine.filter(used_at__date__gte=month_start).count(),
        "expired_this_month": active.filter(expiry_date__gte=month_start, expiry_date__lt=today).count(),
        "meals_planned_this_week": MealPlan.objects.filter(
            user=request.user, planned_date__range=(week_start, week_start + timedelta(days=6))).count(),
        "items_in_kitchen": active.count(),
        "expiring_soon": active.filter(expiry_date__gte=today, expiry_date__lte=today + timedelta(days=3)).count(),
    })
