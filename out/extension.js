"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const child_process_1 = require("child_process");
let objectExplorerPanel;
function activate(context) {
    console.log('Python Object Path Explorer is now active!');
    // Set context for when extension is active
    vscode.commands.executeCommand('setContext', 'python-object-explorer.active', true);
    const disposable = vscode.commands.registerCommand('python-object-explorer.explore', async () => {
        await exploreSelectedVariable(context);
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
async function exploreSelectedVariable(context) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
    }
    if (editor.document.languageId !== 'python') {
        vscode.window.showErrorMessage('This command only works with Python files');
        return;
    }
    // Get selected text or word at cursor
    const selection = editor.selection;
    let selectedText = editor.document.getText(selection);
    if (!selectedText) {
        // Get word at cursor position
        const wordRange = editor.document.getWordRangeAtPosition(selection.active);
        if (wordRange) {
            selectedText = editor.document.getText(wordRange);
        }
    }
    if (!selectedText || !selectedText.trim()) {
        vscode.window.showErrorMessage('No variable selected. Please select a variable name or place cursor on one.');
        return;
    }
    const variableName = selectedText.trim();
    const filePath = editor.document.fileName;
    const lineNumber = selection.active.line + 1; // Convert to 1-based
    // Show loading message
    vscode.window.showInformationMessage(`Exploring ${variableName}...`);
    try {
        const result = await executeAndIntrospect(filePath, lineNumber, variableName, context);
        await showObjectExplorer(result, context);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Failed to explore ${variableName}: ${errorMessage}`);
        console.error('Exploration error:', error);
    }
}
async function executeAndIntrospect(filePath, lineNumber, variableName, context) {
    return new Promise((resolve, reject) => {
        // Create the Python introspection script
        const introspectScript = createIntrospectionScript();
        const scriptPath = path.join(context.extensionPath, 'temp_introspect.py');
        try {
            fs.writeFileSync(scriptPath, introspectScript);
        }
        catch (error) {
            reject(new Error(`Failed to write introspection script: ${error}`));
            return;
        }
        // Execute Python script with arguments
        const pythonProcess = (0, child_process_1.spawn)('python', [
            scriptPath,
            filePath,
            lineNumber.toString(),
            variableName
        ], {
            cwd: path.dirname(filePath)
        });
        let output = '';
        let errorOutput = '';
        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });
        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });
        pythonProcess.on('close', (code) => {
            // Clean up temp file
            try {
                fs.unlinkSync(scriptPath);
            }
            catch (e) {
                console.warn('Failed to clean up temp script:', e);
            }
            if (code !== 0) {
                reject(new Error(`Python execution failed (code ${code}): ${errorOutput}`));
                return;
            }
            try {
                const result = JSON.parse(output);
                resolve(result);
            }
            catch (parseError) {
                reject(new Error(`Failed to parse introspection result: ${parseError}\nOutput: ${output}`));
            }
        });
        pythonProcess.on('error', (error) => {
            reject(new Error(`Failed to start Python process: ${error.message}`));
        });
    });
}
function createIntrospectionScript() {
    return `import sys
import json
import traceback

def safe_repr(obj, max_length=100):
    """Safely represent an object as a string"""
    try:
        result = repr(obj)
        if len(result) > max_length:
            result = result[:max_length] + '...'
        return result
    except Exception:
        return f"<{type(obj).__name__} object>"

def introspect_object(obj, base_name="obj", max_depth=4, max_items=20):
    """Introspect a Python object and return access patterns"""
    
    def _introspect_recursive(obj, expr, depth, seen):
        if depth <= 0:
            return {
                "expr": expr,
                "type": type(obj).__name__,
                "preview": "... (max depth)",
                "children": []
            }
            
        obj_id = id(obj)
        if obj_id in seen:
            return {
                "expr": expr,
                "type": type(obj).__name__,
                "preview": "... (circular reference)",
                "children": []
            }
        
        seen.add(obj_id)
        
        try:
            preview = safe_repr(obj)
        except Exception as e:
            preview = f"<{type(obj).__name__} - error in repr: {e}>"
        
        node = {
            "expr": expr,
            "type": type(obj).__name__,
            "preview": preview,
            "children": []
        }
        
        try:
            # Dictionary-like objects
            if hasattr(obj, 'keys') and hasattr(obj, '__getitem__'):
                keys = list(obj.keys())[:max_items]
                for key in keys:
                    try:
                        value = obj[key]
                        # Create safe key representation for the expression
                        if isinstance(key, str) and key.isidentifier():
                            # Could use dot notation, but bracket is more universal
                            child_expr = f"{expr}[{repr(key)}]"
                        else:
                            child_expr = f"{expr}[{repr(key)}]"
                        
                        child_node = _introspect_recursive(value, child_expr, depth-1, seen.copy())
                        node["children"].append(child_node)
                    except Exception as e:
                        # Add error node for inaccessible keys
                        node["children"].append({
                            "expr": f"{expr}[{repr(key)}]",
                            "type": "Error", 
                            "preview": f"Error accessing key: {e}",
                            "children": []
                        })
            
            # List/Tuple-like objects (but not strings)
            elif hasattr(obj, '__len__') and hasattr(obj, '__getitem__') and not isinstance(obj, (str, bytes)):
                try:
                    length = min(len(obj), max_items)
                    for i in range(length):
                        try:
                            value = obj[i]
                            child_expr = f"{expr}[{i}]"
                            child_node = _introspect_recursive(value, child_expr, depth-1, seen.copy())
                            node["children"].append(child_node)
                        except (IndexError, TypeError) as e:
                            node["children"].append({
                                "expr": f"{expr}[{i}]",
                                "type": "Error",
                                "preview": f"Error accessing index {i}: {e}",
                                "children": []
                            })
                    
                    # Add length info if truncated
                    if hasattr(obj, '__len__') and len(obj) > max_items:
                        node["children"].append({
                            "expr": f"len({expr})",
                            "type": "int",
                            "preview": f"{len(obj)} (showing first {max_items})",
                            "children": []
                        })
                        
                except Exception:
                    pass  # Skip if we can't get length
            
            # Object attributes
            else:
                # Get non-private, non-callable attributes
                attrs = []
                try:
                    for attr_name in dir(obj):
                        if not attr_name.startswith('_'):
                            try:
                                attr_value = getattr(obj, attr_name)
                                if not callable(attr_value):
                                    attrs.append(attr_name)
                            except Exception:
                                # Some attributes might not be accessible
                                continue
                except Exception:
                    pass
                
                # Limit number of attributes to explore
                for attr_name in attrs[:max_items]:
                    try:
                        attr_value = getattr(obj, attr_name)
                        child_expr = f"{expr}.{attr_name}"
                        child_node = _introspect_recursive(attr_value, child_expr, depth-1, seen.copy())
                        node["children"].append(child_node)
                    except Exception as e:
                        node["children"].append({
                            "expr": f"{expr}.{attr_name}",
                            "type": "Error",
                            "preview": f"Error accessing attribute: {e}",
                            "children": []
                        })
                        
        except Exception as e:
            node["error"] = f"Error during introspection: {e}"
        
        seen.discard(obj_id)  # Remove from seen set when backtracking
        return node
    
    return _introspect_recursive(obj, base_name, max_depth, set())

def main():
    if len(sys.argv) != 4:
        print(json.dumps({"error": "Usage: script.py <file_path> <line_number> <variable_name>"}))
        return
    
    file_path = sys.argv[1]
    try:
        line_number = int(sys.argv[2])
    except ValueError:
        print(json.dumps({"error": "Invalid line number"}))
        return
    
    variable_name = sys.argv[3]
    
    try:
        # Read and execute the file up to the specified line
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        # Execute only up to the specified line
        code_to_execute = ''.join(lines[:line_number])
        
        # Create execution environment
        exec_globals = {
            '__name__': '__main__',
            '__file__': file_path
        }
        exec_locals = {}
        
        # Execute the code
        exec(code_to_execute, exec_globals, exec_locals)
        
        # Find the variable (check locals first, then globals)
        target_var = None
        if variable_name in exec_locals:
            target_var = exec_locals[variable_name]
        elif variable_name in exec_globals:
            target_var = exec_globals[variable_name]
        
        if target_var is not None:
            result = introspect_object(target_var, variable_name)
            print(json.dumps(result, indent=2))
        else:
            print(json.dumps({
                "error": f"Variable '{variable_name}' not found in scope",
                "available_vars": list(exec_locals.keys()) + [k for k in exec_globals.keys() if not k.startswith('__')]
            }))
            
    except Exception as e:
        print(json.dumps({
            "error": f"Execution failed: {str(e)}",
            "traceback": traceback.format_exc()
        }))

if __name__ == "__main__":
    main()
`;
}
async function showObjectExplorer(data, context) {
    if (objectExplorerPanel) {
        // Reuse existing panel
        objectExplorerPanel.reveal();
    }
    else {
        // Create new panel
        objectExplorerPanel = vscode.window.createWebviewPanel('pythonObjectExplorer', 'Python Object Path Explorer', vscode.ViewColumn.Beside, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        // Reset panel when closed
        objectExplorerPanel.onDidDispose(() => {
            objectExplorerPanel = undefined;
        });
        // Load HTML content
        const htmlContent = getWebviewContent(context);
        objectExplorerPanel.webview.html = htmlContent;
        // Handle messages from webview
        objectExplorerPanel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'copied':
                    vscode.window.showInformationMessage(`Copied: ${message.text}`);
                    break;
                case 'insert':
                    insertAtCursor(message.text);
                    break;
            }
        });
    }
    // Send data to webview
    objectExplorerPanel.webview.postMessage({
        command: 'showObject',
        objectData: data
    });
}
function insertAtCursor(text) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const position = editor.selection.active;
        editor.edit(editBuilder => {
            editBuilder.insert(position, text);
        });
    }
}
function getWebviewContent(context) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Python Object Path Explorer</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 15px; 
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        
        .header {
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        
        .header h2 {
            margin: 0;
            color: var(--vscode-textLink-foreground);
        }
        
        .tree-node { 
            margin-left: 20px; 
            margin-bottom: 5px;
        }
        
        .node-header { 
            cursor: pointer; 
            padding: 8px;
            border-left: 3px solid var(--vscode-textLink-foreground);
            margin: 2px 0;
            background: var(--vscode-list-hoverBackground);
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .node-header:hover { 
            background: var(--vscode-list-activeSelectionBackground); 
        }
        
        .node-content {
            flex-grow: 1;
        }
        
        .expandable .expand-icon::before { content: "▶ "; }
        .expanded .expand-icon::before { content: "▼ "; }
        .expand-icon { 
            display: inline-block; 
            width: 20px;
            color: var(--vscode-icon-foreground);
        }
        
        .node-expr { 
            font-family: 'Courier New', 'Consolas', monospace; 
            font-weight: bold; 
            color: var(--vscode-textPreformat-foreground);
        }
        
        .node-type { 
            color: var(--vscode-descriptionForeground); 
            font-size: 0.9em; 
            margin-left: 8px;
        }
        
        .node-preview { 
            color: var(--vscode-string-foreground); 
            font-style: italic; 
            margin-left: 8px;
            font-size: 0.9em;
        }
        
        .node-actions {
            display: flex;
            gap: 5px;
        }
        
        .copy-btn, .insert-btn { 
            background: var(--vscode-button-background); 
            color: var(--vscode-button-foreground); 
            border: none; 
            padding: 4px 8px; 
            font-size: 0.8em;
            border-radius: 3px;
            cursor: pointer;
        }
        
        .copy-btn:hover, .insert-btn:hover { 
            background: var(--vscode-button-hoverBackground); 
        }
        
        .hidden { display: none; }
        
        .error {
            color: var(--vscode-errorForeground);
            background: var(--vscode-inputValidation-errorBackground);
            border-left-color: var(--vscode-errorForeground);
        }
        
        .loading {
            text-align: center;
            padding: 20px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>🔍 Python Object Path Explorer</h2>
    </div>
    
    <div id="content">
        <div class="loading">Ready to explore Python objects...</div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function createTreeNode(data) {
            const div = document.createElement('div');
            div.className = 'tree-node';
            
            const header = document.createElement('div');
            const hasChildren = data.children && data.children.length > 0;
            const isError = data.type === 'Error' || data.error;
            
            header.className = \`node-header \${hasChildren ? 'expandable' : ''} \${isError ? 'error' : ''}\`;
            
            const nodeContent = document.createElement('div');
            nodeContent.className = 'node-content';
            
            const expandIcon = hasChildren ? '<span class="expand-icon"></span>' : '<span class="expand-icon" style="width: 20px;"></span>';
            
            nodeContent.innerHTML = \`
                \${expandIcon}
                <span class="node-expr">\${escapeHtml(data.expr)}</span>
                <span class="node-type">(\${data.type})</span>
                <span class="node-preview">: \${escapeHtml(data.preview)}</span>
            \`;
            
            const actions = document.createElement('div');
            actions.className = 'node-actions';
            
            if (!isError) {
                actions.innerHTML = \`
                    <button class="copy-btn" onclick="copyExpression('\${escapeForJs(data.expr)}')">Copy</button>
                    <button class="insert-btn" onclick="insertExpression('\${escapeForJs(data.expr)}')">Insert</button>
                \`;
            }
            
            header.appendChild(nodeContent);
            header.appendChild(actions);
            
            if (hasChildren && !isError) {
                header.onclick = (e) => {
                    if (e.target.classList.contains('copy-btn') || e.target.classList.contains('insert-btn')) {
                        return;
                    }
                    toggleNode(div, header);
                };
            }
            
            div.appendChild(header);
            
            if (hasChildren) {
                const childrenContainer = document.createElement('div');
                childrenContainer.className = 'hidden';
                
                data.children.forEach(child => {
                    childrenContainer.appendChild(createTreeNode(child));
                });
                
                div.appendChild(childrenContainer);
            }
            
            return div;
        }
        
        function toggleNode(nodeDiv, headerDiv) {
            const childrenDiv = nodeDiv.querySelector('div:last-child');
            const expandIcon = headerDiv.querySelector('.expand-icon');
            
            if (childrenDiv.classList.contains('hidden')) {
                childrenDiv.classList.remove('hidden');
                headerDiv.classList.remove('expandable');
                headerDiv.classList.add('expanded');
            } else {
                childrenDiv.classList.add('hidden');
                headerDiv.classList.remove('expanded'); 
                headerDiv.classList.add('expandable');
            }
        }
        
        function copyExpression(expr) {
            navigator.clipboard.writeText(expr).then(() => {
                vscode.postMessage({ command: 'copied', text: expr });
            });
        }
        
        function insertExpression(expr) {
            vscode.postMessage({ command: 'insert', text: expr });
        }
        
        function escapeHtml(unsafe) {
            return unsafe
                 .replace(/&/g, "&amp;")
                 .replace(/</g, "&lt;")
                 .replace(/>/g, "&gt;")
                 .replace(/"/g, "&quot;")
                 .replace(/'/g, "&#039;");
        }
        
        function escapeForJs(str) {
            return str.replace(/\\\\/g, '\\\\\\\\').replace(/'/g, "\\\\'");
        }
        
        function renderTree(data) {
            const content = document.getElementById('content');
            content.innerHTML = '';
            
            if (data.error) {
                content.innerHTML = \`
                    <div class="error" style="padding: 15px; border-radius: 5px;">
                        <strong>Error:</strong> \${escapeHtml(data.error)}
                        \${data.available_vars ? \`<br><br><strong>Available variables:</strong> \${data.available_vars.join(', ')}\` : ''}
                        \${data.traceback ? \`<br><br><strong>Traceback:</strong><pre style="margin-top: 10px; font-size: 0.8em;">\${escapeHtml(data.traceback)}</pre>\` : ''}
                    </div>
                \`;
            } else {
                content.appendChild(createTreeNode(data));
            }
        }
        
        // Listen for data from extension
        window.addEventListener('message', event => {
            const data = event.data;
            if (data.command === 'showObject') {
                renderTree(data.objectData);
            }
        });
    </script>
</body>
</html>`;
}
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map