import requests
import json
import sys
from datetime import datetime
import os

def test_endpoints():
    # Use backend service name when running inside Docker
    base_url = "http://backend:8000" if os.path.exists("/.dockerenv") else "http://localhost:8080"
    endpoints = [
        "/",  # Basic health check
        "/notes",  # Get all notes
        "/notes/1",  # Specific note
        "/notes/1/attachments",  # Note attachments
        "/notes/1/attachments/31/content"  # Specific attachment content
    ]
    
    print(f"\nNetwork Test Report - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("-" * 50)
    print(f"Using base URL: {base_url}")
    
    # Get the auth token (you'll need to replace these with valid credentials)
    auth_data = {
        "username": "test@example.com",  # Replace with your test email
        "password": "testpassword123"    # Replace with your test password
    }
    
    try:
        auth_response = requests.post(f"{base_url}/token", data=auth_data)
        if auth_response.status_code == 200:
            token = auth_response.json()["access_token"]
            headers = {
                "Authorization": f"Bearer {token}",
                "Accept": "*/*"
            }
            print("✓ Authentication successful")
        else:
            print("✗ Authentication failed:", auth_response.status_code)
            print("Response:", auth_response.text)
            return
    except requests.exceptions.RequestException as e:
        print("✗ Connection error during authentication:", str(e))
        return

    # Test each endpoint
    for endpoint in endpoints:
        url = f"{base_url}{endpoint}"
        try:
            print(f"\nTesting: {url}")
            response = requests.get(url, headers=headers, timeout=5)
            print(f"Status Code: {response.status_code}")
            print(f"Headers: {json.dumps(dict(response.headers), indent=2)}")
            
            if response.status_code != 200:
                print(f"Error Response: {response.text}")
            else:
                content_type = response.headers.get('content-type', '')
                if 'application/json' in content_type:
                    print("Response (JSON):", json.dumps(response.json(), indent=2))
                elif 'image' in content_type:
                    print(f"Response: Binary image data ({len(response.content)} bytes)")
                else:
                    print(f"Response: {response.text[:200]}...")
                    
        except requests.exceptions.Timeout:
            print(f"✗ Timeout accessing {endpoint}")
        except requests.exceptions.RequestException as e:
            print(f"✗ Error accessing {endpoint}: {str(e)}")

if __name__ == "__main__":
    test_endpoints() 