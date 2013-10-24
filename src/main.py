#python imports
import os
import webapp2
import jinja2

from google.appengine.ext import db

#self written imports
from models import *

#define where the templates are loaded from and creating the jinja2 environment
template_dir = os.path.join(os.path.dirname(__file__), 'templates')
jinja_env = jinja2.Environment(loader = jinja2.FileSystemLoader(template_dir),
                               autoescape = True)

#make sure the college is inside the datastore
college_query = db.Query(College)
if college_query.count()==0:
  college = College(name="Albright College", address="1621 N. 13th Street, Reading, PA 19604",
                    lat=40.360634, lng=-75.909729)
  college.put()

class Handler(webapp2.RequestHandler):
    def write(self, *a, **kw):
        self.response.write(*a, **kw)
        
    def render_str(self, template, **params):
        t = jinja_env.get_template(template)
        return t.render(params)
    
    def render(self, template, **kw):
        self.write(self.render_str(template, **kw))

class MainPage(Handler):
    def get(self):
        self.response.out.write('Hello, world!')
        
class MapHandler(Handler):
    def render_map(self, college="", user=""):
        self.render("map.html", college=college, user=user)
        

    def get(self):
        college_query = db.Query(College)
        college = college_query.get()
        self.render_map(college, "Nick Hultz")
       
        
app = webapp2.WSGIApplication([
    ('/', MapHandler),
], debug=True)



