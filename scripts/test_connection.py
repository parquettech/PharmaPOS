"""Test connection to backend API"""
import requests
import json

# Test backend health
print("Testing Backend Connection...")
try:
    response = requests.get("http://localhost:5000/health", timeout=5)
    print(f"[OK] Backend is running - Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except requests.exceptions.ConnectionError:
    print("[ERROR] Cannot connect to backend. Is it running on port 5000?")
except Exception as e:
    print(f"[ERROR] {e}")

# Test login endpoint (without credentials)
print("\nTesting Login Endpoint...")
try:
    response = requests.post(
        "http://localhost:5000/api/auth/login",
        json={"username": "test", "password": "test"},
        timeout=5
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except requests.exceptions.ConnectionError:
    print("[ERROR] Cannot connect to backend")
except Exception as e:
    print(f"[ERROR] {e}")
