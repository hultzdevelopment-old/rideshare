from google.appengine.ext import db
from google.appengine.api import users

class College(db.Model):
    name = db.StringProperty()
    address = db.StringProperty()
    lat = db.FloatProperty()
    lng = db.FloatProperty()
    
class UserPrefs(db.Model):
    userid = db.StringProperty(required=True)
    name=db.StringProperty(required=True)
    date_created = db.DateTimeProperty(auto_now_add=True)
    
    @classmethod
    def by_id(cls, uid):
        u = cls.all().filter('userid =', str(uid)).get()
        return u
    