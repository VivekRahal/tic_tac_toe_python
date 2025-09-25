from __future__ import annotations

from typing import Dict


# Central place to manage question prompts used by the analysis endpoints.
# Add/edit prompts here; keys are stable IDs consumed by the frontend.
QUESTIONS: Dict[str, str] = {
    "rics_analyze": (
        "Act as a UK RICS residential surveyor. From the image(s), identify visible defects "
        "(e.g., damp, mould, cracking, leaks, roof or joinery issues). Provide concise findings and "
        "solutions aligned with RICS standards and guidance. Respond ONLY as strict JSON with this schema:\n"
        "{\n  \"title\": string,\n  \"summary\": string,\n  \"findings\": string[],\n  \"recommended_actions\": string[],\n  \"risk_level\": one of [\"low\", \"moderate\", \"high\"],\n  \"keywords\": string[]\n}\n"
        "Keep the language clear and professional."
    ),
    "general": (
        "You are a building pathology assistant. Extract visible issues and suggest practical next steps. "
        "Return strict JSON (title, summary, findings[], recommended_actions[], risk_level, keywords[])."
    ),
    "rics_single_image": (
        "Act as a UK RICS residential surveyor. From this single image of a property area/room, identify any visible defects "
        "(e.g., damp, mould, cracking, leaks, roof, joinery, finishes, services) and give concise remedial actions aligned with the "
        "RICS Home Survey Standard and related guidance. Where relevant, briefly comment on habitability/fitness for occupation and "
        "whether the observed issues could reasonably support a negotiation on purchase price (do NOT give a monetary figure). "
        "Respond ONLY as strict JSON with this schema:\n"
        "{\n  \"title\": string,\n  \"summary\": string,\n  \"findings\": string[],\n  \"recommended_actions\": string[],\n  \"risk_level\": one of [\"low\", \"moderate\", \"high\"],\n  \"keywords\": string[]\n}\n"
        "Keep the language clear, objective, and in a professional tone."
    ),
}
