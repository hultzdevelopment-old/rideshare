from google.appengine.ext import ndb
from google.appengine.api import users

def create_entity_parent(entity_group, group_name = 'albright'):
    return ndb.Key(entity_group, group_name)

class College(ndb.Model):
    name = ndb.StringProperty()
    address = ndb.StringProperty()
    lat = ndb.FloatProperty()
    lng = ndb.FloatProperty()
    
class UserPrefs(ndb.Model):
    userid = ndb.StringProperty(required=True)
    name = ndb.StringProperty(required=True)
    email = ndb.StringProperty()
    date_created = ndb.DateTimeProperty(auto_now_add=True)
    
    @classmethod
    def by_id(cls, uid):
        u = cls.query(ancestor=create_entity_parent('UserGroup','albrightusers')).filter(cls.userid == str(uid)).get()
        return u
    
class Ride(ndb.Model):
    max_passengers = ndb.IntegerProperty()
    num_passengers = ndb.IntegerProperty()
    passengers = ndb.KeyProperty(repeated=True)
    
    driver = ndb.StringProperty()
    drivername = ndb.StringProperty()
    
    start_point_title = ndb.StringProperty()
    start_point_lat = ndb.FloatProperty()
    start_point_long = ndb.FloatProperty()
    
    destination_title = ndb.StringProperty()
    destination_lat = ndb.FloatProperty()
    destination_long = ndb.FloatProperty()
    
    ToD = ndb.DateProperty()
    part_of_day = ndb.StringProperty()
    time = ndb.StringProperty()
    
    contact = ndb.StringProperty()
    comment = ndb.StringProperty()
    
    def to_dict(self):
        res = {}
        for k in Ride._properties:   ## special case ToD
            if k != 'ToD' and k != 'driver' and k != 'passengers':
                res[k] = getattr(self,k) #eval('self.'+k)
                
        res['ToD'] = str(self.ToD)
        
        if self.driver:
            res['driver'] = self.driver
        else:
            res['driver'] = "needs driver"
            
        res['key'] = unicode(self.key)
        res['passengers'] = [str(p) for p in self.passengers]
        return res
    
class Passenger(ndb.Model):
    passid = ndb.StringProperty()
    fullname = ndb.StringProperty()
    contact = ndb.StringProperty()
    location = ndb.StringProperty()
    lat = ndb.FloatProperty()
    lng = ndb.FloatProperty()
    ride = ndb.KeyProperty(kind=Ride)
    