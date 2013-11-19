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
    
class Ride(db.Model):
    max_passengers = db.IntegerProperty()
    num_passengers = db.IntegerProperty()
    driver = db.StringProperty()
    drivername = db.StringProperty()
    start_point_title = db.StringProperty()
    start_point_lat = db.FloatProperty()
    start_point_long = db.FloatProperty()
    destination_title = db.StringProperty()
    destination_lat = db.FloatProperty()
    destination_long = db.FloatProperty()
    ToD = db.DateProperty()
    part_of_day = db.StringProperty()
    time = db.StringProperty()
    passengers = db.ListProperty(db.Key)
    contact = db.StringProperty()
    comment = db.StringProperty()
    