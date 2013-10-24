from google.appengine.ext import db
from google.appengine.api import users

class College(db.Model):
    name = db.StringProperty()
    address = db.StringProperty()
    lat = db.FloatProperty()
    lng = db.FloatProperty()
    