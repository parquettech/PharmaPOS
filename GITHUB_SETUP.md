# GitHub Repository Setup Guide

This document outlines the steps to prepare and push the PharmaPOS project to GitHub.

## ✅ Cleanup Completed

The following unwanted files have been removed:
- ✅ `__pycache__/` directories (Python cache)
- ✅ `*.pyc` files (Python compiled files)
- ✅ OS-specific files (.DS_Store, Thumbs.db, desktop.ini)
- ✅ Log files (*.log)
- ✅ Temporary files (*.tmp, *.temp, *.bak)

## 📋 Pre-Push Checklist

### 1. Verify .gitignore
The `.gitignore` file has been updated to exclude:
- Dependencies (node_modules, __pycache__)
- Environment variables (.env files)
- Build outputs (dist/, build/)
- IDE files (.vscode/, .idea/)
- OS files (.DS_Store, Thumbs.db)
- Log files (*.log)
- Temporary files (*.tmp, *.temp)

### 2. Sensitive Files Check
⚠️ **IMPORTANT**: Ensure the following files are NOT committed:
- `backend/.env` - Contains Supabase credentials
- Any `*.key` or `*.pem` files
- `secrets.json` or `config.json` with credentials

The `.gitignore` already excludes these, but double-check before pushing!

### 3. Environment Variables
Make sure you have:
- `backend/env.example.txt` - Example environment file (this is safe to commit)
- `backend/.env` - Your actual environment file (should NOT be committed)

## 🚀 Steps to Push to GitHub

### Step 1: Initialize Git Repository (if not already done)
```bash
git init
```

### Step 2: Add All Files
```bash
git add .
```

### Step 3: Verify What Will Be Committed
```bash
git status
```

**Double-check that:**
- No `.env` files are listed
- No `__pycache__` directories are listed
- No `node_modules` are listed
- No sensitive files are listed

### Step 4: Create Initial Commit
```bash
git commit -m "Initial commit: PharmaPOS application"
```

### Step 5: Create GitHub Repository
1. Go to https://github.com/new
2. Create a new repository (don't initialize with README)
3. Copy the repository URL

### Step 6: Add Remote and Push
```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

## 🔧 Cleanup Scripts

Two cleanup scripts are available for future use:

### Python Script (Cross-platform)
```bash
python scripts/cleanup.py
```

### PowerShell Script (Windows)
```powershell
.\scripts\cleanup.ps1
```

## 📝 Recommended Repository Structure

Your repository should look like this:
```
PharmaPOS/
├── backend/
│   ├── .env                    # ❌ NOT committed (in .gitignore)
│   ├── env.example.txt         # ✅ Committed (example file)
│   ├── requirements.txt        # ✅ Committed
│   └── ...
├── frontend/
│   ├── node_modules/          # ❌ NOT committed (in .gitignore)
│   ├── package.json           # ✅ Committed
│   └── ...
├── .gitignore                  # ✅ Committed
├── README.md                   # ✅ Committed
└── ...
```

## ⚠️ Security Reminders

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Never commit API keys or secrets** - Use environment variables
3. **Review `git status` before committing** - Ensure no sensitive files are included
4. **Use `env.example.txt`** - Provide example environment files for other developers

## 📚 Additional Resources

- [GitHub Docs: Adding a file to a repository](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)
- [GitHub Docs: Ignoring files](https://docs.github.com/en/get-started/getting-started-with-git/ignoring-files)
