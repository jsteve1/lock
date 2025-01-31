import requests
import json
import os
from datetime import datetime
import base64

def test_attachments():
    # Use backend service name when running inside Docker
    base_url = "http://backend:8000"
    
    print(f"\nAttachment Test Report - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("-" * 50)
    
    # Get the auth token
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

    # Create a test note first
    note_data = {
        "title": "Test Note",
        "content": "This is a test note for attachment testing",
        "color": "#ffffff",
        "is_archived": False,
        "is_pinned": False
    }
    
    try:
        note_response = requests.post(
            f"{base_url}/notes",
            headers={"Authorization": headers["Authorization"], "Content-Type": "application/json"},
            json=note_data
        )
        
        if note_response.status_code == 201:
            note = note_response.json()
            note_id = note["id"]
            print(f"✓ Created test note with ID: {note_id}")
        else:
            print("✗ Failed to create test note:", note_response.status_code)
            print("Error:", note_response.text)
            return
            
        # Create a test image file
        test_image_path = "test_image.jpg"
        try:
            # Create a small test image (1x1 pixel, black)
            with open(test_image_path, "wb") as f:
                f.write(base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="))
            print("✓ Created test image")
            
            # Upload the test image
            files = {"file": ("test.jpg", open(test_image_path, "rb"), "image/jpeg")}
            
            print(f"\nUploading attachment to note {note_id}")
            upload_response = requests.post(
                f"{base_url}/notes/{note_id}/attachments",
                headers={"Authorization": headers["Authorization"]},
                files=files
            )
            
            if upload_response.status_code == 201:
                attachment = upload_response.json()
                print("✓ Upload successful")
                print(f"Attachment ID: {attachment['id']}")
                print(f"Filename: {attachment['filename']}")
                print(f"Content Type: {attachment['content_type']}")
                
                # Try to retrieve the attachment
                print(f"\nRetrieving attachment {attachment['id']}")
                content_response = requests.get(
                    f"{base_url}/notes/{note_id}/attachments/{attachment['id']}/content",
                    headers=headers
                )
                
                if content_response.status_code == 200:
                    print("✓ Content retrieved successfully")
                    print(f"Content Length: {len(content_response.content)} bytes")
                    print(f"Content Type: {content_response.headers.get('content-type')}")
                    
                    # Save the retrieved content to verify it
                    retrieved_path = "retrieved_image.jpg"
                    with open(retrieved_path, "wb") as f:
                        f.write(content_response.content)
                    print(f"✓ Saved retrieved content to {retrieved_path}")
                else:
                    print("✗ Failed to get content:", content_response.status_code)
                    print("Error:", content_response.text)
            else:
                print("✗ Upload failed:", upload_response.status_code)
                print("Error:", upload_response.text)
                
        except Exception as e:
            print(f"✗ Error during test: {str(e)}")
        finally:
            # Cleanup
            if os.path.exists(test_image_path):
                os.remove(test_image_path)
                print(f"\n✓ Cleaned up {test_image_path}")
            
            # Delete the test note
            try:
                delete_response = requests.delete(
                    f"{base_url}/notes/{note_id}",
                    headers={"Authorization": headers["Authorization"]}
                )
                if delete_response.status_code == 204:
                    print(f"✓ Cleaned up test note {note_id}")
                else:
                    print(f"✗ Failed to clean up test note {note_id}")
            except Exception as e:
                print(f"✗ Error cleaning up test note: {str(e)}")
                
    except Exception as e:
        print(f"✗ Error creating test note: {str(e)}")

if __name__ == "__main__":
    test_attachments() 