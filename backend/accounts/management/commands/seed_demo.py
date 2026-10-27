from django.core.management.base import BaseCommand

from accounts.demo import ensure_demo_user, seed_demo_data


class Command(BaseCommand):
    help = "Create or refresh the shared demo kitchen."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Wipe and re-create the demo data.")

    def handle(self, *args, **options):
        user = ensure_demo_user()
        seed_demo_data(user, reset=options["reset"])
        self.stdout.write(self.style.SUCCESS("Demo kitchen ready."))
