### Instrucrtion on how to download and run this wbesite on your local computer

### Requirements:
- Python 3.10+ installed

### Steps:

### Download the project from github 

 - Open the repository link
 - Click green button "Code"
 - Click "Download zip"
### Running the project
- Extract the zip file to convenient location
- Open a terminal and navigate to path where the zip file is (ex: "cd Desktop")
- Run these commands base on OS
### macOS:
python3 -m venv venv

source venv/bin/activate

python -m pip install --upgrade pip

# if requirements.txt exist:

  pip install -r requirements.txt
  
# if not :

  pip install Django==4.2.27
  
python manage.py migrate

python manage.py runserver

### Windows:
py -m venv .venv

.\.venv\Scripts\Activate.ps1

python -m pip install --upgrade pip

# if requirements.txt exist: 
  pip install -r requirements.txt
# if not :
  pip install Django==4.2.27
  
py manage.py migrate

py manage.py runserver

### Open the website 
- Open a browser and got to the link provided in terminal 
