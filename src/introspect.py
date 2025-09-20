# introspect.py - Standalone Python script for object analysis
import sys
import json
import types
from pathlib import Path

def introspect_object(obj, 
                      base_name="obj", 
                      max_depth=4, 
                      max_items=20):
    """
    Introspect a Python object and return access patterns
    """
    def _introspect_recursive(obj, expr, depth, seen):
        if depth <= 0 or id(obj) in seen:
            return {
                "expr": expr,
                "type": type(obj).__name__,
                "preview": "...",
                "children": []
            }
        
        seen.add(id(obj))
        
        try:
            preview = repr(obj)[:100]
        except:
            preview = f"<{type(obj).__name__} object>"
        
        node = {
            "expr": expr,
            "type": type(obj).__name__,
            "preview": preview,
            "children": []
        }
        
        try:
            # Dictionary-like
            if hasattr(obj, 'keys') and hasattr(obj, '__getitem__'):
                for i, key in enumerate(obj.keys()):
                    if i >= max_items:
                        break
                    try:
                        value = obj[key]
                        child_expr = f"{expr}[{repr(key)}]"
                        child_node = _introspect_recursive(value, child_expr, depth-1, seen)
                        node["children"].append(child_node)
                    except:
                        continue
            
            # List-like  
            elif hasattr(obj, '__len__') and hasattr(obj, '__getitem__') and not isinstance(obj, str):
                length = min(len(obj), max_items)
                for i in range(length):
                    try:
                        value = obj[i]
                        child_expr = f"{expr}[{i}]"
                        child_node = _introspect_recursive(value, child_expr, depth-1, seen)
                        node["children"].append(child_node)
                    except:
                        continue
            
            # Object attributes
            else:
                attrs = [attr for attr in dir(obj) 
                        if not attr.startswith('_') and not callable(getattr(obj, attr, None))]
                for i, attr in enumerate(attrs[:max_items]):
                    try:
                        value = getattr(obj, attr)
                        child_expr = f"{expr}.{attr}"
                        child_node = _introspect_recursive(value, child_expr, depth-1, seen)
                        node["children"].append(child_node)
                    except:
                        continue
                        
        except Exception as e:
            node["error"] = str(e)
        
        return node
    
    return _introspect_recursive(obj, base_name, max_depth, set())

def get_framework_patterns(obj):
    """Generate framework-specific access patterns"""
    patterns = []
    
    # Pandas DataFrame
    if hasattr(obj, 'columns') and hasattr(obj, 'iloc'):
        patterns.extend([
            f"df.head()",
            f"df.info()",
            f"df.describe()",
        ])
        if hasattr(obj, 'columns'):
            for col in list(obj.columns)[:5]:
                patterns.append(f"df['{col}']")
                patterns.append(f"df.loc[:, '{col}']")
    
    # NumPy array
    elif hasattr(obj, 'shape') and hasattr(obj, 'dtype'):
        patterns.extend([
            f"arr.shape  # {obj.shape}",
            f"arr.dtype  # {obj.dtype}",
            f"arr[0]" if len(obj.shape) >= 1 else None,
            f"arr[:, 0]" if len(obj.shape) >= 2 else None,
        ])
    
    return [p for p in patterns if p]

if __name__ == "__main__":
    # Get arguments: file_path, line_number, variable_name
    file_path = sys.argv[1]
    line_number = int(sys.argv[2]) 
    variable_name = sys.argv[3]
    
    # Execute file up to specified line
    with open(file_path, 'r') as f:
        lines = f.readlines()
    
    code_to_execute = ''.join(lines[:line_number])
    
    # Create execution environment
    exec_globals = {'__name__': '__main__'}
    exec_locals = {}
    
    try:
        exec(code_to_execute, exec_globals, exec_locals)
        
        # Find the variable
        target_var = exec_locals.get(variable_name) or exec_globals.get(variable_name)
        
        if target_var is not None:
            result = introspect_object(target_var, variable_name)
            print(json.dumps(result, indent=2))
        else:
            print(json.dumps({"error": f"Variable '{variable_name}' not found"}))
            
    except Exception as e:
        print(json.dumps({"error": f"Execution failed: {str(e)}"}))