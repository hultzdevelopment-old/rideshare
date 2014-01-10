"""Built in Python import files"""
import os
import webapp2
import jinja2
import hmac
import re
import random
import json
import logging

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

rideshare_email = "nhultz328@gmail.com"
rideshare_website = "www.albrightrideshare.appspot.com"

DEFAULT_GROUP_NAME = 'albright'

def dateformat(value, format='%b %d, %Y'):
    return value.strftime(format)

jinja_env.filters['date'] = dateformat

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
    if email.endswith('albright.edu'):
        match = re.search(r'[a-z]+.[a-z]+', email)
        name_list = match.group().split('.')
    
        first_name = name_list[0].capitalize()
        last_name = name_list[1].capitalize()
        name = first_name + ' ' + last_name
    else:
        name_list = email.split('@')
        name = name_list[0]

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
            allRides = Ride.query(ancestor=create_entity_parent('RideGroup'))
            
            my_rides_driver = allRides.filter(Ride.driver == str(self.user.userid)).fetch(50)
            for rides in my_rides_driver:
                rides.safekey = rides.key.urlsafe()
                
            my_rides_pass = []
            
            for ride in allRides:
                ride.passenger_info=[]
                passenger_list = ride.passengers
                for key in passenger_list:
                    person = key.get()
                    ride.passenger_info.append(person)
                    if person.passid == self.user.userid:
                        my_rides_pass.append(ride)
                        
                        
                
            logout_url = users.create_logout_url('/logout')
            self.render('home.html', college = mycollege, user = self.user.name, logout_url=logout_url, 
                        driving_rides = my_rides_driver, pass_rides = my_rides_pass)
        else:
            self.redirect('/')

"""Handles the creation of new rides and the insertion into the datastore"""
class NewRideHandler(Handler):
    def get(self):
        newRide = Ride(parent=create_entity_parent('RideGroup'))

        initial_number = self.request.get("contact")
        if not "-" in initial_number:
            contact_number = initial_number[0:3] + '-' + initial_number[3:6] + '-' + initial_number[6:]
        else:
            contact_number = initial_number
        newRide.contact = contact_number
        
        isDriver = self.request.get("isDriver")
        if isDriver.lower() == "true":
            isDriver = True
        else:
            isDriver = False
            
        lat = float(self.request.get("lat")) * (random.random() * (1.000001-.999999) + 1.000001)
        lng = float(self.request.get("lng")) * (random.random() * (1.000001-.999999) + 1.000001)
        
        direction = self.request.get("direction")
        
        if direction == 'tocollege':
            newRide.start_point_title = self.request.get("start_point")
            newRide.start_point_lat = lat
            newRide.start_point_long = lng
            newRide.destination_title = mycollege.name
            newRide.destination_lat = mycollege.lat
            newRide.destination_long = mycollege.lng
            
        elif direction == 'fromcollege':
            newRide.start_point_title = mycollege.name
            newRide.start_point_lat = mycollege.lat
            newRide.start_point_long = mycollege.lng
            newRide.destination_title = self.request.get("destination")
            newRide.destination_lat = lat
            newRide.destination_long = lng 
        
        year = int(self.request.get("year"))
        month = int(self.request.get("month"))
        day = int(self.request.get("day"))
        
        earlylate = self.request.get("earlylate")
        part_of_day = self.request.get("partofday")
        

        newRide.part_of_day = earlylate + ' ' + part_of_day
        newRide.ToD = date(int(year),int(month)+1,int(day))
        
        max_pass = int(self.request.get("maxp"))
        newRide.max_passengers = max_pass
        
        newRide.comment = self.request.get("comment") 
        
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
        
    def sendRideEmail(self, ride):
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
        in the form YYYY-MM-DD
        """
        # Create a query object
        allRides = Ride.query(ancestor=create_entity_parent('RideGroup'))
        # Check to see if the browser side provided us with before/after dates
        after_date = self.request.get("after")
        before_date = self.request.get("before")
        # If there is an after date then limit the rides to those after the date
        # using the filter method
        if after_date:
            after_y,after_m,after_d = after_date.split('-')
            allRides.filter(Ride.ToD >= date(int(after_y),int(after_m),int(after_d)))

        if before_date:
            y,m,d = before_date.split("-")
            allRides.filter('ToD <=', date(int(y),int(m),int(d)))

        # Now put together the json result to send back to the browser.
        json_result = json.dumps([r.to_dict() for r in allRides])
        self.response.headers.add_header('content-type','application/json')
        self.write(json_result)
        
class AddPassengerHandler(Handler): 
    """
    Handles addition of passengers
    """
    def get(self):
        """
          Called when adding a passenger to a ride
      
          Arguments:
          - 'self'
      
        Web Arguments:
          - ride-key
          - contact
          - location
          - lat
          - lng
          """
          
        # The current user can add himself to the ride.  No need for this in the form.
        user = self.user
        
        key = self.request.get('ride_key')
        contact = self.request.get('contact')
        location = self.request.get('location')
        lat = float(self.request.get('lat'))
        lng = float(self.request.get('lng'))
    
        ride_key = ndb.Key(urlsafe=key)
        ride = ride_key.get()
        
        messages={}
        
        if ride == None: # Check if the ride was found
            logging.debug("No Ride Found")
            messages['NoRide'] = "The requested ride was not found in the database."
        
        # Check to see if the ride is full
        elif ride.max_passengers == ride.num_passengers:
            logging.debug("Not enough space on ride")
            message['RideFull']= "The ride you are trying to join has been filled already."
        
        # Check if the current user is already on the ride
        already = False
        for p in ride.passengers:
            if p.get().passid == user.userid:
                already = True
              
        if already:
            logging.debug("Already on the ride")
            messages['ArePass'] = "You are already a part of this ride."            
            
        # Check if the current user is already the driver for the ride
        elif user.userid == ride.driver:
            logging.debug("Is currently the driver of this ride")
            messages['AreDriver'] = "You can't be a passenger if you are the driver to this ride."
        
        else:
            logging.debug("Ride joined successfully")
            passenger = Passenger()
            passenger.passid = str(user.userid)
            passenger.fullname = user.name
            passenger.contact = contact
            passenger.location = location
            passenger.lat = lat
            passenger.lng = lng
            passenger.ride = ride_key
            pass_key = passenger.put()
        
            ride.num_passengers = ride.num_passengers + 1
            ride.passengers.append(pass_key)
            ride.put()
        
        logging.debug(messages)
        
        json_result = json.dumps(messages)
        self.response.headers.add_header('content-type','application/json')
        self.write(json_result)

        def sendDriverEmail(self,ride):
            logging.debug(ride.driver)
            driver = FBUser.get_by_key_name(ride.driver)
            logging.debug(driver)
            if not ride.driver:
                return
            if driver.loginType == "google":
               to = driver
            else:
               logging.debug(ride.driver)
               to = FBUser.get_by_key_name(ride.driver)
               logging.debug(to)
            sender = FROM_EMAIL_ADDR
            subject = "New Passenger for your ride"
            p = db.get(ride.passengers[-1])
            user = FBUser.get_by_key_name(p.name)
            body = """
                Dear %s,
                We wanted to let you know that %s has been added to your ride
                from %s to %s on %s.  If you need to contact %s you can do so at %s.
                
                Thanks for being a driver!
                
                Sincerely,
                
                The Rideshare Team
                """ % (to.nickname(), user.nickname(), ride.start_point_title, ride.destination_title,
           ride.ToD, user.nickname(), p.contact)
    
            if driver.loginType == "google":
              logging.debug(body)
              mail.send_mail(sender,to.email,subject,body)
            else:
              graph = facebook.GraphAPI(to.access_token)
              logging.debug(graph)
              graph.put_object("me", "feed", message=body)
              
class AddDriverHandler(Handler): 
    """
    Handles addition of a new driver
    """
    def get(self):
        """
          Called when adding a passenger to a ride
      
          Arguments:
          - 'self'
      
        Web Arguments:
          - ride-key
          - contact
          - numPass
          """
        user = self.user
        
        key = self.request.get('key')
        contact = self.request.get('contact')
        numPass = self.request.get('numpass')
    
        ride_key = ndb.Key(urlsafe=key)
        ride = ride_key.get()
        
        messages={}
        
        if ride == None: # Check if the ride was found
            logging.debug("No Ride Found")
            messages['NoRide'] = "The requested ride was not found in the database."
    
        # Check if the current user is already on the ride
        already = False
        for p in ride.passengers:
            if p.get().passid == user.userid:
                already = True
              
        if already:
            logging.debug("Already on the ride")
            messages['ArePass'] = "You are already a passenger of this ride."            
            
        # Check if the current user is already the driver for the ride
        elif user.userid == ride.driver:
            logging.debug("Is currently the driver of this ride")
            messages['AreDriver'] = "You already are the driver for this ride"
        
        else:
            logging.debug("Ride joined successfully")
            ride.driver = user.userid
            ride.drivername = user.name
            ride.contact = contact
            ride.max_passengers = int(numPass)
            ride.put()
        
        logging.debug(messages)
        
        json_result = json.dumps(messages)
        self.response.headers.add_header('content-type','application/json')
        self.write(json_result)

class EditRideHandler(Handler):
    def get(self):
        get_key = self.request.get("key")
        ride_key = ndb.Key(urlsafe=get_key)
        ride = ride_key.get()
        
        leaving_time = ride.part_of_day.split(' ')

        pass_list = []
        for key in ride.passengers:
            pass_list.append(key.get().fullname)
        
        logout_url = users.create_logout_url('/logout')
        self.render('edit.html', college=mycollege, logout_url=logout_url, passengers=pass_list, safekey=ride.key.urlsafe(),
                                ride=ride, user=self.user.name, earlylate=leaving_time[0], part_of_day=leaving_time[1])

class ChangeRideHandler(Handler):
    def post(self):
        ride_key = ndb.Key(urlsafe=self.request.get("key"))
        ride = ride_key.get()

        contact = self.request.get("contact")
        comment = self.request.get("ridecomment")
        partofday = self.request.get("partofday")
        earlylate = self.request.get("earlylate")
        numpass = self.request.get("numpass")
    
        partOfDay = earlylate + " " + partofday
        
        ride.part_of_day = partOfDay
        ride.contact = contact
        ride.comment = comment
        ride.max_passengers = int(numpass)

        ride.put()
        self.redirect("/home")
        
class DeleteRideHandler(Handler):
    """
    Deletes a ride using a key
    """
    def get(self):
        ride_key = ndb.Key(urlsafe=self.request.get("key"))
        ride = ride_key.get()
        
        if ride.num_passengers == 0:
            ride.key.delete()
        else:
            ride.driver = None
            ride.put()
            for key in ride.passengers:
                person = key.get()
                #self.sendRiderEmail()

        self.redirect('/home')

    def sendRiderEmail(self):
        if loginType == "facebook":
            to = FBUser.get_by_key_name(to)
            logging.debug(to)
        sender = FROM_EMAIL_ADDR
        subject = "Change in your ride"
        
        body = """
            Dear %s,
            
            We wanted to let you know that there has been a change in status of your ride
            from %s to %s on %s.  Unfortunately the driver is unable to drive anymore.
            The ride will remain, but it will appear as a ride
            that is in need of a driver.  When a new driver is found you will be notified
            by email.
            
            
            Sincerely,
            
            The Rideshare Team
            """ % (to.nickname(),  ride.start_point_title, ride.destination_title, ride.ToD)
        if loginType == "google":
            mail.send_mail(sender,to,subject,body)
        else:
            try:
                graph = facebook.GraphAPI(to.access_token)
                graph.put_object("me", "feed", message=body)

            except:
                logging.debug(graph.put_object("me", "feed", message=body))
        
    
"""This section handles login and logout of the app.
The handlers are Login, Logout, and ErrorLogin"""
class LoginHandler(Handler):
    """For Login"""
    def get(self):
        user = users.get_current_user()
        if user and (user.email().endswith("albright.edu") or user.email().endswith("alb.edu") or user.email().endswith("gmail.com")): 
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
                               ('/getrides', RideQueryHandler),
                               ('/addpass', AddPassengerHandler),
                               ('/adddriver', AddDriverHandler),
                               ('/editride', EditRideHandler),
                               ('/applyedits', ChangeRideHandler),
                               ('/deleteride', DeleteRideHandler)
], debug=True)



