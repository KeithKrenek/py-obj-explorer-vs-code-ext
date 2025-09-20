# Python Object Path Explorer - Single User MVP

A VS Code extension that instantly shows you the correct syntax to access values within any Python object.

## Quick Setup (Windows)

### Prerequisites
- VS Code installed
- Python installed and available in PATH
- Node.js and npm installed

### Installation Steps

1. **Create extension directory:**
   ```cmd
   mkdir python-object-path-explorer
   cd python-object-path-explorer
   ```

2. **Create the extension files:**
   - Copy the `package.json` content into `package.json`
   - Create `src/extension.ts` and copy the TypeScript content
   - Create `tsconfig.json` and copy the configuration
   - Create `test_objects.py` for testing

3. **Install dependencies:**
   ```cmd
   npm install
   ```

4. **Compile TypeScript:**
   ```cmd
   npm run compile
   ```

5. **Run the extension:**
   - Open VS Code
   - Press `F5` to open Extension Development Host
   - In the new VS Code window, open the `test_objects.py` file

### Usage

1. **Place cursor on a variable** (like `user_data` in the test file)
2. **Press `Ctrl+Alt+E`** or right-click and select "Explore Object Path"  
3. **A panel opens** showing the object structure with clickable access paths
4. **Click "Copy"** to copy syntax to clipboard, or **"Insert"** to insert at cursor

### File Structure
```
python-object-path-explorer/
├── package.json              # Extension manifest
├── tsconfig.json             # TypeScript config
├── src/
│   └── extension.ts          # Main extension code
├── test_objects.py           # Test file with sample objects
└── out/                      # Compiled JavaScript (generated)
    └── extension.js
```

### Testing Examples

The `test_objects.py` file includes various object types to test:

- **Dictionaries:** `user_data`, `api_response`, `config`
- **Lists:** `mixed_list`
- **Custom Objects:** `person` (Person class instance)
- **Pandas:** `df` (DataFrame), `ages` (Series) - if pandas installed
- **NumPy:** `numbers`, `simple_array` - if numpy installed

### Troubleshooting

**Python not found:**
- Ensure Python is in your PATH
- Or modify the `spawn('python', ...)` call in `extension.ts` to use full path like `spawn('C:\\Python39\\python.exe', ...)`

**Extension not activating:**
- Make sure you're in a Python file when testing
- Check VS Code Developer Console (`Help` → `Toggle Developer Tools`) for errors

**Execution errors:**
- Check that the file syntax is valid Python
- Variables must be defined before the line where you activate the extension
- Complex imports might cause issues - test with simple objects first

### Current Limitations (MVP)

- Only works with Python files
- Executes code up to cursor line (be mindful of side effects in your test code)
- Limited error handling - if something breaks, check the console
- Windows-focused (paths, Python execution)
- No configuration UI - hardcoded settings

### Next Steps

Once the MVP is working, we can add:
- Framework-specific handling (better pandas/numpy support)
- Safe execution mode with sandboxing
- Static analysis fallback
- Performance optimizations for large objects
- Configuration options

## Development Notes

This is a single-user MVP focused on proving the concept. The code prioritizes functionality over robustness - perfect for rapid iteration and testing.

### Key Files Explained

- **`package.json`**: VS Code extension manifest with commands, keybindings, and menus
- **`extension.ts`**: Main extension logic with Python execution and WebView management
- **`tsconfig.json`**: TypeScript compilation settings
- **`test_objects.py`**: Sample objects for testing the extension

### How It Works

1. **Command Activation**: User presses Ctrl+Alt+E on a variable
2. **Code Execution**: Extension creates a temporary Python script that executes the file up to the cursor line
3. **Object Introspection**: Python script analyzes the target variable and returns JSON structure
4. **UI Display**: WebView panel shows interactive tree with copy/insert buttons
5. **Clipboard Integration**: Users can copy access paths or insert them directly into code

Ready to explore Python objects like never before!