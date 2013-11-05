#python imports
import os
import webapp2
import jinja2
import hmac

from google.appengine.ext import db
from google.appengine.api import users

#self written imports
from models import *

#define where the templates are loaded from and create the jinja2 environment
template_dir = os.path.join(os.path.dirname(__file__), 'templates')
jinja_env = jinja2.Environment(loader = jinja2.FileSystemLoader(template_dir),
                               autoescape = True)

secret = 'nAIq3dHJ9gNN*jql9P*u%@zOdceZ&V2MUSe0DxYSnna$!n699^!cx2K9qP~IXtEbtnrjFc1#7At'

#make sure the college is inside the datastore
college_query = db.Query(College)
if college_query.count()==0:
  college = College(name="Albright College", address="1621 N. 13th Street, Reading, PA 19604",
                    lat=40.360634, lng=-75.909729)
  college.put()
  
def render_str(template, **params):
    t = jinja_env.get_template(template)
    return t.render(params)

def make_secure_val(val):
    return '%s|%s' % (val, hmac.new(secret, val).hexdigest())

def check_secure_val(secure_val):
    val = secure_val.split('|')[0]
    if secure_val == make_secure_val(val):
        return val

#Base Handler with useful convience functions
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
        self.set_secure_cookie('user_id', str(user.key().id()))

    def logout(self):
        self.response.headers.add_header('Set-Cookie', 'user_id=; Path=/')

    def initialize(self, *a, **kw):
        webapp2.RequestHandler.initialize(self, *a, **kw)
        uid = self.read_secure_cookie('user_id')
        self.user = uid and User.by_id(int(uid))
        
class MainHandler(Handler):
    def render_map(self, college="", user="",logout_url=""):
        self.render("main.html", college=college, user=user, logout_url=logout_url)
        
    def get(self):
        college = db.Query(College).get()
        logout_url = users.create_logout_url('/logout')
        self.render_map(college, "Nick Hultz", logout_url)
        
class HomeHandler(Handler):
    def get(self):
        college = db.Query(College).get()
        logout_url = users.create_logout_url('/logout')
        self.render('home.html', college=college, logout_url=logout_url)

class LoginHandler(Handler):
    def get(self):
        user = users.get_current_user()
        college = db.Query(College).get()
        
        if user and user.email().endswith("albright.edu"):
            self.redirect('/main')
        else:   
            login_url = users.create_login_url('/')
            self.render("loginPage.html", college = college, login = login_url)

class LogoutHandler(Handler):
    def get(self):
        college = db.Query(College).get()
        self.render("logoutPage.html", college=college)
        
class HelpHandler(Handler):
    def get(self):
        college = db.Query(College).get()
        logout_url = users.create_logout_url('/logout')
        self.render("help.html", college = college, logout_url = logout_url)
       
        
app = webapp2.WSGIApplication([
                               ('/', LoginHandler),
                               ('/main', MainHandler),
                               ('/home', HomeHandler),
                               ('/logout', LogoutHandler),
                               ('/help', HelpHandler)
], debug=True)



