# Test file for Python Object Path Explorer
# Place cursor on any variable and press Ctrl+Alt+E to explore it

# Simple dictionary
user_data = {
    'id': 123,
    'name': 'John Doe',
    'email': 'john@example.com',
    'profile': {
        'age': 30,
        'location': 'New York',
        'interests': ['python', 'vscode', 'coding']
    },
    'settings': {
        'notifications': True,
        'theme': 'dark',
        'language': 'en'
    }
}

# List with mixed types
mixed_list = [
    'string item',
    42,
    {'nested': 'dictionary'},
    [1, 2, 3],
    True
]

# API response simulation
api_response = {
    'status': 'success',
    'data': {
        'users': [
            {
                'id': 1,
                'username': 'alice',
                'roles': ['admin', 'user'],
                'metadata': {
                    'last_login': '2025-01-15T10:30:00Z',
                    'permissions': ['read', 'write', 'delete']
                }
            },
            {
                'id': 2,
                'username': 'bob', 
                'roles': ['user'],
                'metadata': {
                    'last_login': '2025-01-14T15:45:00Z',
                    'permissions': ['read']
                }
            }
        ],
        'pagination': {
            'page': 1,
            'per_page': 10,
            'total': 2
        }
    },
    'meta': {
        'request_id': 'req_123456',
        'timestamp': '2025-01-15T12:00:00Z'
    }
}

# Custom class
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age
        self.hobbies = ['reading', 'swimming']
        self.address = {
            'street': '123 Main St',
            'city': 'Boston',
            'zip': '02101'
        }
    
    def greet(self):
        return f"Hello, I'm {self.name}"

# Instance of custom class
person = Person("Alice", 28)

# Complex nested structure
config = {
    'database': {
        'host': 'localhost',
        'port': 5432,
        'credentials': {
            'username': 'admin',
            'password': 'secret123'
        },
        'options': {
            'pool_size': 10,
            'timeout': 30,
            'ssl': True
        }
    },
    'api': {
        'endpoints': {
            'users': '/api/v1/users',
            'auth': '/api/v1/auth',
            'data': '/api/v1/data'
        },
        'rate_limits': {
            'requests_per_minute': 100,
            'burst_limit': 20
        }
    },
    'features': ['caching', 'logging', 'monitoring']
}

# Try pandas if available
try:
    import pandas as pd
    
    # Sample DataFrame
    df = pd.DataFrame({
        'name': ['Alice', 'Bob', 'Charlie'],
        'age': [25, 30, 35],
        'city': ['NY', 'LA', 'Chicago'],
        'salary': [50000, 60000, 70000]
    })
    
    # Series
    ages = df['age']
    
except ImportError:
    print("Pandas not available - skipping DataFrame examples")
    df = None
    ages = None

# Try numpy if available  
try:
    import numpy as np
    
    # NumPy array
    numbers = np.array([[1, 2, 3], [4, 5, 6], [7, 8, 9]])
    
    # 1D array
    simple_array = np.array([10, 20, 30, 40, 50])
    
except ImportError:
    print("NumPy not available - skipping array examples")
    numbers = None
    simple_array = None

# Instructions for testing
print("Python Object Path Explorer Test File")
print("=====================================")
print("1. Place your cursor on any variable name above")
print("2. Press Ctrl+Alt+E or right-click and select 'Explore Object Path'")
print("3. A panel will open showing the object structure and access paths")
print("4. Click 'Copy' to copy access syntax or 'Insert' to insert at cursor")
print("\nTry exploring these variables:")
print("- user_data (nested dictionary)")
print("- mixed_list (list with different types)")  
print("- api_response (simulated API response)")
print("- person (custom class instance)")
print("- config (deeply nested configuration)")
if 'df' in globals() and df is not None:
    print("- df (pandas DataFrame)")
    print("- ages (pandas Series)")
if 'numbers' in globals() and numbers is not None:
    print("- numbers (numpy array)")
    print("- simple_array (1D numpy array)")