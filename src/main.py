"""Built in Python import files"""
import os
import webapp2
import jinja2
import hmac
import re
import random
import json

from datetime import date

from google.appengine.ext import ndb
from google.appengine.api import users
from google.appengine.api import mail

"""Self-written python files"""
from models import *

"""Defined jinja environment that defines where the html templates are located"""
template_dir = os.path.join(os.path.dirname(__file__), 'templates')
jinja_env = jinja2.Environment(loader = jinja2.FileSystemLoader(template_dir),
                               autoescape = True)


secret = 'nAIq3dHJ9gNN*jql9P*u%@zOdceZ&V2MUSe0DxYSnna$!n699^!cx2K9qP~IXtEbtnrjFc1#7At'

early_late_strings = { "0": "Early", "1": "Late" }
part_of_day_strings = { "0": "Morning", "1": "Afternoon", "2": "Evening" }

rideshare_email = "nhultz328@gmail.com"
rideshare_website = "www.albrightrideshare.appspot.com"

DEFAULT_GROUP_NAME = 'albright'

"""Used mainly to make cookie values secure"""
def make_secure_val(val):
    return '%s|%s' % (val, hmac.new(secret, val).hexdigest())

"""makes sure the login cookie hasn't been tampered with"""
def check_secure_val(secure_val):
    val = secure_val.split('|')[0]
    if secure_val == make_secure_val(val):
        return val

"""Used to take a student albright email and return
a first and last name for the greeting"""
def format_name(email):
    match = re.search(r'[a-z]+.[a-z]+', email)
    name_list = match.group().split('.')
    
    first_name = name_list[0].capitalize()
    last_name = name_list[1].capitalize()
    name = first_name + ' ' + last_name
    return name

"""Create default parent keys so taht queries are Strongly Consistent"""
def create_entity_parent(entity_group, group_name = DEFAULT_GROUP_NAME):
    return ndb.Key(entity_group, group_name)

"""Global query to see what the college information is.
Also makes sure that the datastore actually contains the college info"""
college_query = College.query()
if college_query.count()==0:
    mycollege = College(parent=create_entity_parent('CollegeGroup','mycollege'))
    mycollege.name="Albright College"
    mycollege.address="1621 N. 13th Street, Reading, PA 19604"
    mycollege.lat=40.360634 
    mycollege.lng=-75.909729
    mycollege.put()
else:
    mycollege = College.query(ancestor=create_entity_parent('CollegeGroup','mycollege')).get()

"""Base Handler with convenience functions that most other handlers inherit from."""
class Handler(webapp2.RequestHandler):
    def write(self, *a, **kw):
        self.response.write(*a, **kw)
        
    def render_str(self, template, **params):
        t = jinja_env.get_template(template)
        return t.render(params)
    
    def render(self, template, **kw):
        self.write(self.render_str(template, **kw)) 
        
    def set_secure_cookie(self, name, val):
        cookie_val = make_secure_val(val)
        self.response.headers.add_header(
            'Set-Cookie',
            '%s=%s; Path=/' % (name, cookie_val))

    def read_secure_cookie(self, name):
        cookie_val = self.request.cookies.get(name)
        return cookie_val and check_secure_val(cookie_val)

    def login(self, user):
        self.set_secure_cookie('userid', str(user.user_id()))

    def logout(self):
        self.response.headers.add_header('Set-Cookie', 'userid=; Path=/')

    def initialize(self, *a, **kw):
        webapp2.RequestHandler.initialize(self, *a, **kw)
        uid = self.read_secure_cookie('userid')
        self.user = uid and UserPrefs.by_id(uid)

"""Main Page handler that renders the first page that people see.
Renders the map and the ride info table"""        
class MainHandler(Handler):
    def render_map(self, college="", user="",logout_url=""):
        self.render("main.html", college=college, user=user, logout_url=logout_url)
        
    def get(self):
        if self.user:   
            logout_url = users.create_logout_url('/logout')
            self.render_map(mycollege, self.user.name, logout_url)
        else:
            self.redirect('/')

"""This section handles the Personal Home page. It displays all ride info that
the person is involved with."""   
class HomeHandler(Handler):
    def get(self):
        if self.user: 
            logout_url = users.create_logout_url('/logout')
            self.render('home.html', college = mycollege, logout_url=logout_url)
        else:
            self.redirect('/')

"""Handles the creation of new rides and the insertion into the datastore"""
class NewRideHandler(Handler):
    def get(self):
        newRide = Ride(parent=create_entity_parent('RideGroup'))
        
        max_pass = int(self.request.get("maxp"))
        initial_number = self.request.get("contact")
        if not "-" in initial_number:
            contact_number = initial_number[0:3] + '-' + initial_number[3:6] + '-' + initial_number[6:]
        else:
            contact_number = initial_number
        newRide.contact = contact_number
        
        isDriver = self.request.get("isDriver")
        if isDriver.lower() == "false":
            isDriver = False
        else:
            isDriver = True
            
        lat = float(self.request.get("lat")) * (random.random() * (1.000001-.999999) + 1.000001)
        lng = float(self.request.get("lng")) * (random.random() * (1.000001-.999999) + 1.000001)
        
        checked = self.request.get("toCollege")
        
        if checked == 'true':
            newRide.start_point_title = self.request.get("from")
            newRide.start_point_lat = lat
            newRide.start_point_long = lng
            newRide.destination_title = mycollege.name
            newRide.destination_lat = mycollege.lat
            newRide.destination_long = mycollege.lng
            
        elif checked == 'false':
            newRide.start_point_title = mycollege.name
            newRide.start_point_lat = mycollege.lat
            newRide.start_point_long = mycollege.lng
            newRide.destination_title = self.request.get("to")
            newRide.destination_lat = lat
            newRide.destination_long = lng 
        
        year = int(self.request.get("year"))
        month = int(self.request.get("month"))
        day = int(self.request.get("day"))
        
        earlylate_value = self.request.get("earlylate")
        part_of_day_value = self.request.get("partofday")

        earlylate = early_late_strings[earlylate_value]
        part_of_day = part_of_day_strings[part_of_day_value]
        

        newRide.part_of_day = earlylate + ' ' + part_of_day
        newRide.ToD = date(int(year),int(month),int(day))
        
        newRide.max_passengers = max_pass
        newRide.passengers = []
        
        if isDriver:
            newRide.driver = str(self.user.userid)
            newRide.drivername = self.user.name
            newRide.num_passengers = 0
        else:
            passenger = Passenger()
            passenger.passid = str(self.user.userid)
            passenger.fullname = self.user.name
            passenger.contact = contact_number
            passenger.location = newRide.destination_title
            passenger.lat = lat
            passenger.lng = lng
            pass_key = passenger.put()
            newRide.passengers.append(pass_key)
            newRide.num_passengers = 1
        
        ride_key = newRide.put()
        if not isDriver:
            passenger.ride = ride_key
            passenger.put()
        
        #self.sendRideEmail(newRide)
        self.redirect("/main")
        
    def sendRideEmail(self, ride):
        logging.debug("Inside sendRideEmail")
        message = mail.EmailMessage()
        message.sender = rideshare_email
        message.subject = "New Ride Created"
        message.to = self.user.email
        
        driverName = None
        passengerName = None
        if ride.driver:
            driverName = self.user.name
        else:
            passengerName = self.user.name
            
        if driverName:
             message.body = """
                A new ride is being offered.  %s is offering a ride from %s to %s on %s.
                Please go to %s if you want to join this ride.
                    
                Thanks,
                    
                The Rideshare Team
                """ % (driverName, ride.start_point_title, ride.destination_title ,ride.ToD, rideshare_website)
        else:
            message.body = """
                A new ride request has been posted.  %s is looking for a ride from %s to %s on %s.
                If you are able to take this person in your car, please go to %s
                            
                Thanks,
                    
                The Rideshare Team
                """ % (passengerName, ride.start_point_title, ride.destination_title, ride.ToD, rideshare_website)
            
        message.send()

class RideQueryHandler(Handler):
    """
    Parse and process requests for rides
    returns json
    """

    def get(self):
        """
        Arguments:
        - `self`:

        The query may be filtered by after date, and before date.  Expect to get the dates
        in the form year, month, and day
        """
        # Create a query object
        allRides = Ride.query(ancestor=create_entity_parent('RideGroup'))
        # Check to see if the browser side provided us with before/after dates
        after_y = self.request.get('year')
        after_m = self.request.get('month')
        after_d = self.request.get('day')
        
        before_date = self.request.get("before")
        # If there is an after date then limit the rides to those after the date
        # using the filter method
        if after_y and after_m and after_d:
            allRides.filter(Ride.ToD >= date(int(after_y),int(after_m),int(after_d)))

        if before_date:
            y,m,d = before_date.split("-")
            allRides.filter('ToD <=', date(int(y),int(m),int(d)))

        # Now put together the json result to send back to the browser.
        json_result = json.dumps([r.to_dict() for r in allRides])
        self.response.headers.add_header('content-type','application/json')
        self.response.out.write(json_result)
        
        
    
"""This section handles login and logout of the app.
The handlers are Login, Logout, and ErrorLogin"""
class LoginHandler(Handler):
    """For Login"""
    def get(self):
        user = users.get_current_user()
        if user and (user.email().endswith("albright.edu") or user.email().endswith("alb.edu")): 
            if UserPrefs.by_id(user.user_id()):
                self.login(user)
                self.redirect('/main')
            else:
                name = format_name(user.email())
                new_user = UserPrefs(parent=create_entity_parent('UserGroup','albrightusers'),
                                     userid = user.user_id(), name = name, email = user.email())
                new_user.put()
                
                self.login(user)
                self.redirect('/main')  
                
        elif user:
            self.redirect('errorLogin')
              
        else:   
            login_url = users.create_login_url('/')
            self.render("loginPage.html", college = mycollege, login = login_url)

class LogoutHandler(Handler):
    """For Logout"""
    def get(self):
        if self.user:
            self.logout()
            self.render("logoutPage.html", college = mycollege)
        else:
            self.redirect('/')
            
class ErrorLoginHandler(Handler):
    """Called when the wrong email is used to login with.
    Redirects to a signout page and then back to the original login page"""

    def get(self):
        logout_url = users.create_logout_url('/')
        self.render("errorLoginPage.html", college = mycollege, logout = logout_url)
        
""" Handler to render the help page.
Accessed by the help link on the main page of the site"""      
class HelpHandler(Handler):
    def get(self):
        if self.user:
            logout_url = users.create_logout_url('/logout')
            self.logout()
            self.render("help.html", college = mycollege, logout_url = logout_url)
        else:
            self.redirect('/')
       
        
app = webapp2.WSGIApplication([
                               ('/', LoginHandler),
                                    ('/errorLogin', ErrorLoginHandler),
                               ('/main', MainHandler),
                               ('/home', HomeHandler),
                               ('/logout', LogoutHandler),
                               ('/help', HelpHandler),
                               ('/newride', NewRideHandler),
                               ('/getrides', RideQueryHandler)
], debug=True)



