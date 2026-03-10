#!/usr/bin/env python3
"""
Cleanup script to remove unwanted files before pushing to GitHub.
This script removes Python cache files, temporary files, and other unwanted artifacts.
"""

import os
import shutil
import sys
from pathlib import Path

# Define patterns and directories to remove
PATTERNS_TO_REMOVE = [
    "**/__pycache__",
    "**/*.pyc",
    "**/*.pyo",
    "**/*.pyd",
    "**/*.py[cod]",
    "**/.DS_Store",
    "**/Thumbs.db",
    "**/desktop.ini",
    "**/*.log",
    "**/*.tmp",
    "**/*.temp",
    "**/*.bak",
    "**/.pytest_cache",
    "**/.coverage",
    "**/htmlcov",
    "**/*.egg-info",
    "**/.vite",
    "**/dist",
    "**/build",
]

DIRECTORIES_TO_REMOVE = [
    "__pycache__",
    ".pytest_cache",
    ".coverage",
    "htmlcov",
    ".vite",
    "dist",
    "build",
    ".cache",
    "logs",
]

FILES_TO_CHECK = [
    ".env",
    "*.key",
    "*.pem",
    "secrets.json",
    "config.json",
    "password.txt",
    "passwords.txt",
]

def remove_patterns(root_dir):
    """Remove files matching patterns"""
    removed_count = 0
    root_path = Path(root_dir)
    
    for pattern in PATTERNS_TO_REMOVE:
        for file_path in root_path.rglob(pattern):
            try:
                if file_path.is_file():
                    file_path.unlink()
                    print(f"Removed file: {file_path}")
                    removed_count += 1
            except Exception as e:
                print(f"Error removing {file_path}: {e}")
    
    return removed_count

def remove_directories(root_dir):
    """Remove unwanted directories"""
    removed_count = 0
    root_path = Path(root_dir)
    
    for dir_name in DIRECTORIES_TO_REMOVE:
        for dir_path in root_path.rglob(dir_name):
            try:
                if dir_path.is_dir():
                    # Skip node_modules as it's large and should be handled separately
                    if "node_modules" in str(dir_path):
                        continue
                    shutil.rmtree(dir_path)
                    print(f"Removed directory: {dir_path}")
                    removed_count += 1
            except Exception as e:
                print(f"Error removing {dir_path}: {e}")
    
    return removed_count

def check_sensitive_files(root_dir):
    """Check for sensitive files that shouldn't be committed"""
    root_path = Path(root_dir)
    sensitive_files = []
    
    for pattern in FILES_TO_CHECK:
        for file_path in root_path.rglob(pattern):
            # Skip example files
            if "example" in str(file_path).lower():
                continue
            sensitive_files.append(file_path)
    
    return sensitive_files

def main():
    """Main cleanup function"""
    # Get project root directory (parent of scripts directory)
    script_dir = Path(__file__).parent
    root_dir = script_dir.parent
    
    print("=" * 60)
    print("PharmaPOS Project Cleanup Script")
    print("=" * 60)
    print(f"Root directory: {root_dir}")
    print()
    
    # Check for sensitive files
    print("Checking for sensitive files...")
    sensitive_files = check_sensitive_files(root_dir)
    if sensitive_files:
        print("WARNING: Found potentially sensitive files:")
        for file_path in sensitive_files:
            print(f"   - {file_path}")
        print("\nPlease ensure these files are in .gitignore and not committed!")
        response = input("\nContinue with cleanup? (y/n): ")
        if response.lower() != 'y':
            print("Cleanup cancelled.")
            return
    else:
        print("No sensitive files found.")
    print()
    
    # Remove files matching patterns
    print("Removing files matching patterns...")
    file_count = remove_patterns(root_dir)
    print(f"Removed {file_count} files.")
    print()
    
    # Remove directories
    print("Removing unwanted directories...")
    dir_count = remove_directories(root_dir)
    print(f"Removed {dir_count} directories.")
    print()
    
    print("=" * 60)
    print("Cleanup completed!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Review .gitignore to ensure all unwanted files are excluded")
    print("2. Run: git init (if not already initialized)")
    print("3. Run: git add .")
    print("4. Run: git commit -m 'Initial commit'")
    print("5. Create repository on GitHub and push")

if __name__ == "__main__":
    main()
