from django.db import models
from django.contrib.auth.models import User 
from datetime import date, timedelta 


#Stores the food items added by user 
class InventoryItem(models.Model):

    #Category options in inventory form
    CATEGORY = [
        ('Pantry','Pantry'),
        ('Fridge','Fridge'),
        ('Freezer','Freezer')
        ]

    #Links item to the user who added it
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    #Item details shown on inventory page
    name = models.CharField(max_length = 100)
    quantity = models.CharField(max_length = 50, blank = True)
    category = models.CharField(max_length = 20 , blank = True)

    #Expiry date for expiry warnings
    expiry_date = models.DateField(null= True, blank = False)
    date_added = models.DateTimeField(auto_now_add = True)

    #Checks if the item expires within 3 days
    def expires_soon(self):
        if self.expiry_date:
            return self.expiry_date <= date.today() + timedelta(days = 3)
        return False 

    #Shows the item name in the admin 
    def __str__(self):
        return self.name

#Store recipes added to the calendar
class MealPlan(models.Model):

    user = models.ForeignKey(User, on_delete = models.CASCADE)

    #Recipe details are saved so the calendar can display it
    recipe_id = models.IntegerField()
    recipe_title = models.CharField(max_length = 200)
    recipe_image = models.URLField(blank = True)

    #Date chosen 
    planned_date = models.DateField()

    def __str__(self):
        return self.recipe_title

#Stores ingredients in the shopping list
class ShoppingListItem(models.Model):

    #Shows whether the item was added manually or from adding recipe 
    SOURCE = [
        ('manual','Manual'),
        ('auto', 'Auto')
        ]

    user = models.ForeignKey(User, on_delete = models.CASCADE)

    #Ingredients details
    ingredient_name = models.CharField(max_length = 100)
    quantity = models.CharField(max_length = 50, blank = True)

    #Helps separate manual items from automatic items
    source = models.CharField(max_length = 10 , choices = SOURCE, default = 'manual')
    date_added = models.DateTimeField(auto_now_add = True)

    def __str__(self):
        return self.ingredient_name

#Stores the user's homepage note
class Reminder(models.Model):
    user = models.OneToOneField(User, on_delete = models.CASCADE)
    note = models.TextField(blank = True)
    updated_at = models.DateTimeField(auto_now = True)

    def __str__(self):
        return f"Reminder for {self.user.username}"