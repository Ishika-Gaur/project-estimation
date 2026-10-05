import json
import os
import re
import asyncio
import ipaddress
import socket
import urllib.parse
from typing import Optional, List
import httpx

from models import ProjectAnalysisInput, ProjectAnalysisResult, Task, ModuleStatus, TeamMember, TaskAssignment


GITHUB_API_URL = "https://api.github.com"
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models"
FALLBACK_MODELS = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.6-flash"]


async def _call_gemini_with_fallback(body: dict, primary_model: str, api_key: str) -> dict:
    models_to_try = [primary_model] + [m for m in FALLBACK_MODELS if m != primary_model]
    last_exc = None

    async with httpx.AsyncClient(timeout=90) as client:
        for current_model in models_to_try:
            for attempt in range(2):
                try:
                    response = await client.post(
                        f"{GEMINI_API_URL}/{current_model}:generateContent",
                        params={"key": api_key},
                        headers={"Content-Type": "application/json"},
                        json=body,
                    )
                    if response.status_code == 200:
                        content = response.json()["candidates"][0]["content"]["parts"][0]["text"]
                        return json.loads(content)

                    print(f"[CostifyAI] Gemini ({current_model}) returned HTTP {response.status_code}: {response.text[:180]}")
                    if response.status_code in {429, 404, 503}:
                        # Rate limited or temporarily overloaded - switch model immediately
                        break
                    elif response.status_code in {500, 502, 504}:
                        await asyncio.sleep(1 + attempt)
                    else:
                        response.raise_for_status()
                except (KeyError, IndexError, json.JSONDecodeError) as exc:
                    print(f"[CostifyAI] Parse error with {current_model}: {exc}")
                    last_exc = exc
                    break
                except Exception as exc:
                    last_exc = exc
                    if attempt == 0:
                        await asyncio.sleep(1)

    raise RuntimeError(f"AI service unavailable across models. Last error: {last_exc}")


# ── SSRF Security Blocklists & URL Sanitization ────────────────────────────────
FORBIDDEN_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),          # RFC 1918 Private
    ipaddress.ip_network("100.64.0.0/10"),        # RFC 6598 Shared Carrier-grade NAT / Cloud internal
    ipaddress.ip_network("127.0.0.0/8"),          # Loopback
    ipaddress.ip_network("169.254.0.0/16"),        # Link-local / Cloud metadata (AWS, GCP, Azure, etc.)
    ipaddress.ip_network("172.16.0.0/12"),        # RFC 1918 Private
    ipaddress.ip_network("192.0.0.0/24"),
    ipaddress.ip_network("192.0.2.0/24"),         # TEST-NET-1
    ipaddress.ip_network("192.88.99.0/24"),
    ipaddress.ip_network("192.168.0.0/16"),       # RFC 1918 Private
    ipaddress.ip_network("198.18.0.0/15"),        # Benchmark testing
    ipaddress.ip_network("198.51.100.0/24"),      # TEST-NET-2
    ipaddress.ip_network("203.0.113.0/24"),       # TEST-NET-3
    ipaddress.ip_network("224.0.0.0/4"),          # Multicast
    ipaddress.ip_network("240.0.0.0/4"),          # Reserved
    ipaddress.ip_network("255.255.255.255/32"),
    # IPv6:
    ipaddress.ip_network("::/128"),
    ipaddress.ip_network("::1/128"),              # IPv6 Loopback
    ipaddress.ip_network("::ffff:0:0/96"),        # IPv4-mapped IPv6
    ipaddress.ip_network("64:ff9b::/96"),
    ipaddress.ip_network("100::/64"),
    ipaddress.ip_network("2001::/23"),
    ipaddress.ip_network("fc00::/7"),             # Unique local
    ipaddress.ip_network("fe80::/10"),            # Link-local
]

FORBIDDEN_HOSTNAMES = {
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "metadata.google.internal",
    "instance-data",
}

BLOCKED_INTERNAL_PORTS = {
    21, 22, 23, 25, 53, 69, 110, 111, 135, 137, 138, 139,
    143, 161, 389, 445, 636, 1433, 1521, 2049, 2375, 2376,
    3306, 3389, 5432, 5984, 6379, 7001, 8086, 9000,
    9200, 9300, 11211, 27017, 27018, 28017
}


def validate_safe_url(target_url: str) -> str:
    """Validate that target_url is safe from Server-Side Request Forgery (SSRF).

    Guarantees:
    1. Only HTTP or HTTPS schemes are allowed.
    2. Hostname is present and cannot be internal/cloud-metadata.
    3. Destination ports do not target internal infrastructure (databases, SSH, etc.).
    4. DNS resolution yields strictly public routable IP addresses.
    """
    if not target_url or not isinstance(target_url, str):
        raise ValueError("URL must be a non-empty string.")

    url = target_url.strip()
    if not (url.startswith("http://") or url.startswith("https://")):
        url = f"https://{url}"

    parsed = urllib.parse.urlparse(url)
    if parsed.scheme.lower() not in ("http", "https"):
        raise ValueError("Invalid URL scheme. Only HTTP and HTTPS are permitted.")

    hostname = parsed.hostname
    if not hostname:
        raise ValueError("Invalid URL: missing hostname.")

    host_lower = hostname.lower()
    if host_lower in FORBIDDEN_HOSTNAMES or host_lower.endswith(".local") or host_lower.endswith(".internal"):
        raise ValueError("Access to internal, loopback, or cloud-metadata hosts is strictly forbidden.")

    if parsed.port and parsed.port in BLOCKED_INTERNAL_PORTS:
        raise ValueError(f"Port {parsed.port} is blocked for security reasons.")

    try:
        addr_info = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise ValueError(f"Unable to resolve host '{hostname}'.") from exc

    if not addr_info:
        raise ValueError(f"No address records found for host '{hostname}'.")

    for entry in addr_info:
        ip_str = entry[4][0]
        try:
            ip = ipaddress.ip_address(ip_str)
        except ValueError as exc:
            raise ValueError(f"Invalid IP address returned for host: {ip_str}") from exc

        if (ip.is_loopback or ip.is_private or ip.is_link_local or
            ip.is_multicast or ip.is_reserved or ip.is_unspecified):
            raise ValueError(f"Target host resolves to restricted IP: {ip_str}.")

        for network in FORBIDDEN_NETWORKS:
            if ip in network:
                raise ValueError(f"Target host resolves to reserved network range: {ip_str}.")

    return url


def _extract_github_info(url: str) -> Optional[tuple]:
    """Extract owner and repo from GitHub URL with strict sanitization"""
    patterns = [
        r'github\.com/([^/]+)/([^/]+)',
        r'github\.com/([^/]+)/([^/]+)\.git',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            owner = match.group(1).strip()
            repo = match.group(2).replace('.git', '').strip()
            # Enforce valid GitHub repository naming syntax
            if re.match(r'^[a-zA-Z0-9_.-]+$', owner) and re.match(r'^[a-zA-Z0-9_.-]+$', repo):
                return owner, repo
    return None


async def _analyze_github_repo(owner: str, repo: str) -> dict:
    """Analyze GitHub repository structure and content"""
    api_key = os.getenv("GITHUB_TOKEN")  # Optional for public repos
    
    headers = {"Accept": "application/vnd.github.v3+json"}
    if api_key:
        headers["Authorization"] = f"token {api_key}"
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            # Get repo info
            repo_response = await client.get(
                f"{GITHUB_API_URL}/repos/{owner}/{repo}",
                headers=headers
            )
            if repo_response.status_code != 200:
                return {"error": "Repository not accessible", "details": str(repo_response.status_code)}
            
            repo_data = repo_response.json()
            
            # Get repository contents
            contents_response = await client.get(
                f"{GITHUB_API_URL}/repos/{owner}/{repo}/contents/",
                headers=headers
            )
            
            contents = []
            if contents_response.status_code == 200:
                contents = contents_response.json()
            
            # Get languages
            languages_response = await client.get(
                f"{GITHUB_API_URL}/repos/{owner}/{repo}/languages",
                headers=headers
            )
            
            languages = {}
            if languages_response.status_code == 200:
                languages = languages_response.json()
            
            return {
                "name": repo_data.get("name"),
                "description": repo_data.get("description"),
                "language": repo_data.get("language"),
                "languages": languages,
                "size": repo_data.get("size"),
                "stargazers": repo_data.get("stargazers_count"),
                "forks": repo_data.get("forks_count"),
                "open_issues": repo_data.get("open_issues_count"),
                "has_wiki": repo_data.get("has_wiki"),
                "has_pages": repo_data.get("has_pages"),
                "topics": repo_data.get("topics", []),
                "default_branch": repo_data.get("default_branch"),
                "contents": contents,
                "is_private": repo_data.get("private", False),
            }
    except Exception as e:
        return {"error": "Failed to analyze repository", "details": str(e)}


async def _analyze_deployed_url(url: str) -> dict:
    """Safely analyze deployed application with comprehensive SSRF protection and response bounds."""
    try:
        current_url = validate_safe_url(url)
    except ValueError as val_err:
        return {"error": "Invalid or disallowed URL", "details": str(val_err), "accessible": False}

    headers = {
        "User-Agent": "CostifyAI-SiteAuditor/1.0 (+https://costifyai.com; security-auditor)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    max_redirects = 3
    final_response = None

    try:
        # Inspect each redirect hop with follow_redirects=False to prevent redirect-based SSRF bypass
        async with httpx.AsyncClient(timeout=15.0, verify=True, follow_redirects=False) as client:
            for _ in range(max_redirects + 1):
                try:
                    response = await client.get(current_url, headers=headers)
                except httpx.RequestError as req_err:
                    return {"error": "Failed to connect to target URL", "details": str(req_err), "accessible": False}

                if response.is_redirect:
                    location = response.headers.get("Location")
                    if not location:
                        break
                    next_url = urllib.parse.urljoin(current_url, location)
                    try:
                        # Re-validate destination against SSRF rules before following redirect
                        current_url = validate_safe_url(next_url)
                    except ValueError as redirect_val_err:
                        return {
                            "error": "Redirect blocked by SSRF security policy",
                            "details": str(redirect_val_err),
                            "accessible": False,
                        }
                    continue
                else:
                    final_response = response
                    break

            if final_response is None:
                return {"error": "Too many redirects or invalid redirect target", "accessible": False}

            # Limit body read to max 500 KB to avoid memory exhaustion / DoS
            content = final_response.text[:500_000]
            title_match = re.search(r'<title>(.*?)</title>', content, re.IGNORECASE)

            # Detect common frameworks/libraries
            detected = []
            content_lower = content.lower()
            if "react" in content_lower:
                detected.append("React")
            if "vue" in content_lower:
                detected.append("Vue.js")
            if "angular" in content_lower:
                detected.append("Angular")
            if "next.js" in content_lower or "__next" in content:
                detected.append("Next.js")
            if "tailwind" in content_lower:
                detected.append("Tailwind CSS")
            if "bootstrap" in content_lower:
                detected.append("Bootstrap")

            # Check for common authentication indicators
            has_login = any(keyword in content_lower for keyword in ["login", "signin", "auth", "sign-in"])
            has_signup = any(keyword in content_lower for keyword in ["signup", "register", "sign-up"])

            return {
                "accessible": True,
                "status_code": final_response.status_code,
                "title": title_match.group(1).strip() if title_match else "No title",
                "detected_technologies": detected,
                "has_login": has_login,
                "has_signup": has_signup,
                "content_length": len(content),
                "note": "Public metadata audit completed safely"
            }
    except Exception as e:
        return {"error": "Failed to analyze deployed URL", "details": str(e), "accessible": False}


def _determine_analysis_source(input_data: ProjectAnalysisInput) -> str:
    """Determine what data sources are available"""
    sources = []
    if input_data.description.strip():
        sources.append("description")
    if input_data.github_url.strip():
        sources.append("github")
    if input_data.deployed_url.strip():
        sources.append("deployed")
    
    if len(sources) == 1:
        return sources[0]
    elif len(sources) == 2:
        return "+".join(sources)
    elif len(sources) == 3:
        return "combined"
    return "unknown"


async def _ai_project_analysis(input_data: ProjectAnalysisInput, github_data: dict, deployed_data: dict) -> ProjectAnalysisResult:
    """Use AI to analyze project based on available data"""
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("AI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured on the backend.")
    
    analysis_source = _determine_analysis_source(input_data)
    
    # Build context for AI
    context = {
        "description": input_data.description,
        "github_available": bool(input_data.github_url),
        "github_data": github_data if not github_data.get("error") else None,
        "deployed_available": bool(input_data.deployed_url),
        "deployed_data": deployed_data if deployed_data.get("accessible") else None,
        "analysis_source": analysis_source,
    }
    
    system_prompt = (
        "You are a senior software architect and project analyst. "
        "Analyze the provided project information and generate a comprehensive project analysis. "
        "Be conservative with completion percentages - only claim something is implemented if there is clear evidence. "
        "When evidence is insufficient, state 'Unable to verify'. "
        "Generate realistic task estimates and dependencies. "
        "Return valid JSON matching the schema."
    )
    
    user_prompt = json.dumps(context, ensure_ascii=False)
    
    model = os.getenv("AI_MODEL", "gemini-3.5-flash")
    
    schema = {
        "type": "object",
        "properties": {
            "overall_completion": {"type": "integer"},
            "project_type": {"type": "string"},
            "modules": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "completion_percentage": {"type": "integer"},
                        "status": {"type": "string"}
                    },
                    "required": ["name", "completion_percentage", "status"]
                }
            },
            "completed_features": {"type": "array", "items": {"type": "string"}},
            "in_progress_features": {"type": "array", "items": {"type": "string"}},
            "remaining_features": {"type": "array", "items": {"type": "string"}},
            "recommended_next_steps": {"type": "array", "items": {"type": "string"}},
            "estimated_remaining_hours": {"type": "integer"},
            "evidence_notes": {"type": "array", "items": {"type": "string"}}
        },
        "required": [
            "overall_completion", "project_type", "modules", "completed_features",
            "in_progress_features", "remaining_features", "recommended_next_steps",
            "estimated_remaining_hours", "evidence_notes"
        ]
    }
    
    body = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": {
            "temperature": 0.3,
            "responseMimeType": "application/json",
            "responseSchema": schema,
        },
    }
    
    try:
        ai_result = await _call_gemini_with_fallback(body, model, api_key)
        return ProjectAnalysisResult(
            overall_completion=ai_result.get("overall_completion", 0),
            modules=[ModuleStatus(**m) for m in ai_result.get("modules", [])],
            completed_features=ai_result.get("completed_features", []),
            in_progress_features=ai_result.get("in_progress_features", []),
            remaining_features=ai_result.get("remaining_features", []),
            recommended_next_steps=ai_result.get("recommended_next_steps", []),
            estimated_remaining_hours=ai_result.get("estimated_remaining_hours", 0),
            project_type=ai_result.get("project_type", "Unknown"),
            analysis_source=analysis_source,
            evidence_notes=ai_result.get("evidence_notes", [])
        )
    except Exception as exc:
        raise RuntimeError(f"AI analysis failed: {exc}") from exc


async def analyze_project(input_data: ProjectAnalysisInput) -> ProjectAnalysisResult:
    """Main function to analyze a project"""
    # Validate at least one input is provided
    if not any([input_data.description.strip(), input_data.github_url.strip(), input_data.deployed_url.strip()]):
        raise ValueError("Please provide at least one project detail — description, GitHub repository, or deployed URL.")
    
    github_data = {}
    deployed_data = {}
    
    # Analyze GitHub if provided
    if input_data.github_url.strip():
        github_info = _extract_github_info(input_data.github_url)
        if github_info:
            github_data = await _analyze_github_repo(github_info[0], github_info[1])
        else:
            github_data = {"error": "Invalid GitHub URL format"}
    
    # Analyze deployed URL if provided
    if input_data.deployed_url.strip():
        deployed_data = await _analyze_deployed_url(input_data.deployed_url)
    
    # Use AI for comprehensive analysis
    return await _ai_project_analysis(input_data, github_data, deployed_data)


async def generate_task_plan(analysis: ProjectAnalysisResult, work_type: str = "solo", team_members: Optional[List[TeamMember]] = None) -> dict:
    """Generate task plan based on analysis and work type"""
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("AI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured on the backend.")
    
    system_prompt = (
        "You are a senior project manager. Generate a dependency-aware task plan based on project analysis. "
        "For solo work, create a sequential dependency chain. "
        "For team work, distribute tasks based on skills and roles. "
        "Return valid JSON."
    )
    
    context = {
        "analysis": analysis.model_dump(),
        "work_type": work_type,
        "team_members": [m.model_dump() for m in team_members] if team_members else None,
    }
    
    user_prompt = json.dumps(context, ensure_ascii=False)
    
    model = os.getenv("AI_MODEL", "gemini-3.5-flash")
    
    if work_type == "solo":
        schema = {
            "type": "object",
            "properties": {
                "tasks": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "description": {"type": "string"},
                            "priority": {"type": "string"},
                            "estimated_hours": {"type": "integer"},
                            "dependencies": {"type": "array", "items": {"type": "string"}},
                            "recommended_order": {"type": "integer"}
                        },
                        "required": ["name", "description", "priority", "estimated_hours", "dependencies", "recommended_order"]
                    }
                }
            },
            "required": ["tasks"]
        }
    else:
        schema = {
            "type": "object",
            "properties": {
                "assignments": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "member_name": {"type": "string"},
                            "tasks": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "name": {"type": "string"},
                                        "description": {"type": "string"},
                                        "priority": {"type": "string"},
                                        "estimated_hours": {"type": "integer"},
                                        "dependencies": {"type": "array", "items": {"type": "string"}},
                                        "recommended_order": {"type": "integer"}
                                    },
                                    "required": ["name", "description", "priority", "estimated_hours", "dependencies", "recommended_order"]
                                }
                            },
                            "total_hours": {"type": "integer"}
                        },
                        "required": ["member_name", "tasks", "total_hours"]
                    }
                },
                "workload_balance": {"type": "string"},
                "overloaded_members": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["assignments", "workload_balance", "overloaded_members"]
        }
    
    body = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": {
            "temperature": 0.3,
            "responseMimeType": "application/json",
            "responseSchema": schema,
        },
    }
    
    try:
        return await _call_gemini_with_fallback(body, model, api_key)
    except Exception as exc:
        print(f"[CostifyAI] Task-plan generation failed: {type(exc).__name__}: {exc}")
        raise RuntimeError(f"Task plan generation failed: {exc}") from exc

