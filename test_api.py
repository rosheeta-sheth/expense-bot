import requests

BASE_URL = 'http://localhost:5001/api'

resp = requests.post(f"{BASE_URL}/auth/register", json={"email": "test4@test.com", "password": "password"})
if resp.status_code != 201:
    resp = requests.post(f"{BASE_URL}/auth/login", json={"email": "test4@test.com", "password": "password"})

token = resp.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

payload = {"category_id": 1, "limit_amount": 5000}
resp = requests.post(f"{BASE_URL}/budgets", json=payload, headers=headers)
print("POST /budgets:", resp.status_code, resp.text)

resp = requests.get(f"{BASE_URL}/budgets", headers=headers)
print("GET /budgets:", resp.status_code, resp.text)
