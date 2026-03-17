from django.db import models
from django.contrib.auth.models import User 
from datetime import date, timedelta 

class InventoryItem(models.Model):
    CATEGORY = [('Pantry','Pantry'),('Fridge','Fridge'),('Freezer','Freezer')]
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length = 100)
    quantity = models.CharField(max_length = 50, blank = True)
    category = models.CharField(max_length = 20 , blank = True)
    expiry_date = models.DateField(null= True, blank = False)
    date_added = models.DateTimeField(auto_now_add = True)

    def expires_soon(self):
        if self.expiry_date:
            return self.expiry_date <= date.today() + timedelta(days = 3)
            return False 

class MealPlan(models.Model):
    user = models.ForeignKey(User, on_delete = models.CASCADE)
    recipe_id = models.IntegerField()
    recipe_title = models.CharField(max_length = 200)
    recipe_image = models.URLField(blank = True)
    planned_date = models.DateField()
class ShoppingListItem(models.Model):
    SOURCE = [('manual','Manual'),('auto', 'Auto')]
    user = models.ForeignKey(User, on_delete = models.CASCADE)
    ingredient_name = models.CharField(max_length = 100)
    quantity = models.CharField(max_length = 50, blank = True)
    is_purchased = models.BooleanField(default = False)
    source = models.CharField(max_length = 10 , choices = SOURCE, default = 'manual')
    date_added = models.DateTimeField(auto_now_add = True)
