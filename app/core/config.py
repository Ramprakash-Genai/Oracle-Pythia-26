from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests
from requests.auth import HTTPBasicAuth
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

load_dotenv()


app = FastAPI()

# Enable CORS for React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Jira credentials
email = os.getenv("ATLASSIAN_EMAIL")
api_token = os.getenv("ATLASSIAN_API_TOKEN")
domain = os.getenv("ATLASSIAN_BASE_URL")

auth = HTTPBasicAuth(email, api_token)
headers = {"Accept": "application/json", "Content-Type": "application/json"}

class SearchRequest(BaseModel):
    project: str
    sprint: str | None = None
    key: str | None = None

def parse_description(desc):
    if not desc or "content" not in desc:
        return ""
    text_parts = []
    for block in desc["content"]:
        if block["type"] == "paragraph":
            for item in block.get("content", []):
                if item["type"] == "text":
                    text_parts.append(item["text"])
        elif block["type"] == "bulletList":
            for li in block.get("content", []):
                for para in li.get("content", []):
                    for item in para.get("content", []):
                        if item["type"] == "text":
                            text_parts.append("• " + item["text"])
    return "\n".join(text_parts)

@app.get("/")
def root():
    return {"message": "FastAPI Jira backend is running. Use /projects, /sprints/{project_key}, /stories/{sprint_id}, or /search."}

@app.get("/projects")
def get_projects():
    url = f"https://{domain}/rest/api/3/project/search"
    response = requests.get(url, headers=headers, auth=auth)
    print("Projects response:", response.text)  # <-- debug
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail=f"Failed to fetch projects: {response.text}")
    projects = response.json().get("values", [])
    return {"projects": [{"key": p["key"], "name": p["name"]} for p in projects]}

@app.get("/sprints/{project_key}")
def get_sprints(project_key: str):
    boards_url = f"https://{domain}/rest/agile/1.0/board?projectKeyOrId={project_key}"
    boards_resp = requests.get(boards_url, headers=headers, auth=auth)
    if boards_resp.status_code != 200:
        raise HTTPException(status_code=400, detail=f"Failed to fetch boards: {boards_resp.text}")
    boards = boards_resp.json().get("values", [])
    if not boards:
        return {"sprints": []}
    board_id = boards[0]["id"]

    sprints_url = f"https://{domain}/rest/agile/1.0/board/{board_id}/sprint"
    sprints_resp = requests.get(sprints_url, headers=headers, auth=auth)
    if sprints_resp.status_code != 200:
        raise HTTPException(status_code=400, detail=f"Failed to fetch sprints: {sprints_resp.text}")
    sprints = sprints_resp.json().get("values", [])
    return {"sprints": [{"id": s["id"], "name": s["name"]} for s in sprints]}

@app.get("/stories/{sprint_id}")
def get_stories(sprint_id: int):
    url = f"https://{domain}/rest/agile/1.0/sprint/{sprint_id}/issue"
    response = requests.get(url, headers=headers, auth=auth)
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail=f"Failed to fetch stories: {response.text}")
    issues = response.json().get("issues", [])
    return {"stories": [{"key": i["key"], "summary": i["fields"]["summary"]} for i in issues]}

@app.post("/search")
def search_issue(req: SearchRequest):
    # Build JQL dynamically
    jql_parts = [f'project = {req.project}']
    if req.sprint:
        jql_parts.append(f'sprint = {req.sprint}')
    if req.key:
        jql_parts.append(f'key = {req.key}')
    jql = " AND ".join(jql_parts)

    url = f"https://{domain}/rest/api/3/search/jql"
    payload = {
        "jql": jql,
        "fields": ["summary", "description", "status", "assignee", "issuetype"]
    }

    response = requests.post(url, headers=headers, auth=auth, json=payload)
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail=f"Failed to fetch issues: {response.text}")

    issues = response.json().get("issues", [])
    if not issues:
        raise HTTPException(status_code=404, detail=f"No issue found for JQL: {jql}")

    issue = issues[0]
    return {
        "key": issue["key"],
        "summary": issue["fields"]["summary"],
        "description": parse_description(issue["fields"].get("description")),
        "assignee": issue["fields"]["assignee"]["displayName"] if issue["fields"].get("assignee") else "Unassigned"
    }