from flask import Blueprint

auth_bp = Blueprint("auth", __name__)
records_bp = Blueprint("records", __name__)
pending_bp = Blueprint("pending", __name__)
customers_bp = Blueprint("customers", __name__)
staffs_bp = Blueprint("staffs", __name__)
finance_bp = Blueprint("finance", __name__)
projects_bp = Blueprint("projects", __name__)
materials_bp = Blueprint("materials", __name__)
templates_bp = Blueprint("templates", __name__)
statistics_bp = Blueprint("statistics", __name__)
system_bp = Blueprint("system", __name__)

from . import auth_routes
from . import records_routes
from . import pending_routes
from . import customers_routes
from . import staffs_routes
from . import finance_routes
from . import projects_routes
from . import materials_routes
from . import templates_routes
from . import statistics_routes
from . import system_routes
