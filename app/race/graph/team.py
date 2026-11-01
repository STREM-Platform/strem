"""The race team as a LangGraph graph (ADR 0010, ai#58 phase 2).

    question → route → specialist × 1-2 (in parallel, each with retrieval tools)
             → compose → guard → answer

The router picks the specialists a question needs. Each specialist sees the
always-on core context (race, intake, profile, injuries, diet) plus the
conversation, and fetches anything else with tools instead of reading a block
with fixed caps. The composer merges drafts into one answer; the guard applies
deterministic safety rules after the model. Offline behaviour is unchanged: no
model, no graph — the caller reports the AI as unavailable.
"""

from __future__ import annotations

import logging
import operator
from typing import Annotated, Any, TypedDict

from langchain_core.messages import AIMessage, AnyMessage, HumanMessage, SystemMessage, ToolMessage
from langgraph.graph import END, START, StateGraph
from langgraph.types import Send

from app.race.ai.models import LangChainRaceAI
from app.race.ai.prompts import RACE_TEAM
from app.race.context import RaceContext, core_lines
from app.race.graph.tools import build_tools

log = logging.getLogger(__name__)

SPECIALISTS: dict[str, str] = {
    "coach": (
        "head coach: training load, the plan and its sessions, recovery, readiness, "
        "progression and the week ahead"
    ),
    "fuel": (
        "fueling and hydration: carbs, fluid and sodium per hour, gut training, race-week "
        "and race-morning eating, what past races taught"
    ),
    "course": (
        "course and terrain: climbs, descents, technical sections, checkpoints, cutoffs "
        "and course-specific preparation"
    ),
    "gear": "gear: mandatory kit, shoes, poles, clothing, and testing kit in training",
    "logistics": (
        "logistics: travel, accommodation, race week, bib pick-up, race morning and "
        "expected conditions"
    ),
    "strategy": (
        "race strategy: pacing by segment, effort, the checkpoint plan, contingencies "
        "and the mental game"
    ),
}
ROUTE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "specialists": {"type": "array", "items": {"type": "string", "enum": list(SPECIALISTS)}},
        "why": {"type": "string"},
    },
    "required": ["specialists", "why"],
    "additionalProperties": False,
}
ROUTER_RULES = (
    "You route an athlete's question to the race-team specialists who should answer it. "
    "Pick one specialist, or two when the question clearly spans both. Specialists:\n"
    + "\n".join(f"- {name}: {focus}" for name, focus in SPECIALISTS.items())
)
TOOL_RULES = (
    "\n\nYou have tools for the athlete's data: training sessions by date, longest sessions, "
    "check-ins, wearable recovery, past races and their lessons, the course, Race Lab layers, "
    "the plan week and race conditions. The context below is only the core; fetch what the "
    "question needs before answering, and cite what you used. Do not guess data you could fetch."
)
COMPOSER_RULES = (
    RACE_TEAM
    + "\n\nSeveral specialists drafted answers to the athlete's question. They wrote them from "
    "the athlete's data, fetched with tools (course GPX, sessions, check-ins, races, layers); "
    "that data is not repeated in the context below, so trust the facts and citations in the "
    "drafts and never say the drafts' sources are missing. Merge them into one answer in the "
    "team's voice: keep every number and citation, remove repetition, resolve conflicts in "
    "favour of safety, and lead with the decision. Never mention drafts or specialists."
)
MAX_TOOL_ROUNDS = 5
HISTORY_TURNS = 30


class TeamState(TypedDict, total=False):
    question: str
    history: list[AnyMessage]
    route: list[str]
    drafts: Annotated[list[dict[str, Any]], operator.add]
    answer: str


class SpecialistTask(TypedDict):
    role: str
    question: str
    history: list[AnyMessage]


def history_messages(turns: list[dict[str, str]]) -> list[AnyMessage]:
    """Stored chat turns → LangChain messages (the newest `HISTORY_TURNS`)."""
    out: list[AnyMessage] = []
    for turn in turns[-HISTORY_TURNS:]:
        out.append(
            HumanMessage(content=turn["content"])
            if turn["role"] == "user"
            else AIMessage(content=turn["content"])
        )
    return out


def build_team(ai: LangChainRaceAI, ctx: RaceContext) -> Any:
    core = "\n".join(core_lines(ctx))
    tools = build_tools(ctx)
    by_name = {t.name: t for t in tools}

    async def route(state: TeamState) -> dict[str, Any]:
        last = state["history"][-1].text if state.get("history") else ""
        prompt = (
            f"Previous message: {last[:600]}\n\nQuestion: {state['question']}"
            if last
            else f"Question: {state['question']}"
        )
        decision = await ai.complete_json(
            rules=ROUTER_RULES,
            context=core,
            prompt=prompt,
            schema=ROUTE_SCHEMA,
            max_tokens=300,
            effort="low",
        )
        picked = [s for s in decision.get("specialists") or [] if s in SPECIALISTS][:2] or ["coach"]
        log.info("race team route %s (%s)", picked, str(decision.get("why"))[:120])
        return {"route": picked}

    def dispatch(state: TeamState) -> list[Send]:
        return [
            Send(
                "specialist",
                {"role": role, "question": state["question"], "history": state.get("history", [])},
            )
            for role in state["route"]
        ]

    async def specialist(task: SpecialistTask) -> dict[str, Any]:
        role = task["role"]
        rules = (
            f"{RACE_TEAM}\n\nIn this answer you speak as the team's {SPECIALISTS[role]}."
            f"{TOOL_RULES}"
        )
        model = ai.tool_model(tools, max_tokens=2500, effort="low")
        messages: list[AnyMessage] = [
            SystemMessage(content=f"{rules}\n\n{core}"),
            *task["history"],
            HumanMessage(content=task["question"]),
        ]
        used: list[str] = []
        for _ in range(MAX_TOOL_ROUNDS):
            reply: AIMessage = await ai.guarded(lambda: model.ainvoke(messages))
            messages.append(reply)
            if not reply.tool_calls:
                break
            for call in reply.tool_calls:
                used.append(call["name"])
                found = by_name.get(call["name"])
                result = (
                    await found.ainvoke(call["args"]) if found else f"Unknown tool {call['name']}."
                )
                messages.append(
                    ToolMessage(content=str(result), tool_call_id=call["id"] or call["name"])
                )
        else:
            # Out of tool rounds: ask for the answer with what was gathered.
            reply = await ai.guarded(
                lambda: ai.tool_model([], max_tokens=2500, effort="low").ainvoke(messages)
            )
        text = LangChainRaceAI.checked(reply).text.strip()
        log.info("race team %s used tools %s", role, used)
        return {"drafts": [{"role": role, "text": text, "tools": used}]}

    async def compose(state: TeamState) -> dict[str, Any]:
        drafts = [d for d in state.get("drafts", []) if d["text"]]
        if len(drafts) == 1:
            return {"answer": drafts[0]["text"]}
        if not drafts:
            return {"answer": ""}
        joined = "\n\n".join(f"[{d['role']}]\n{d['text']}" for d in drafts)
        answer = await ai.complete_text(
            rules=COMPOSER_RULES,
            context=core,
            messages=[
                {"role": "user", "content": f"Question: {state['question']}\n\nDrafts:\n{joined}"}
            ],
            max_tokens=2500,
        )
        return {"answer": answer}

    def guard(state: TeamState) -> dict[str, Any]:
        return {"answer": safety_guard(ctx, state.get("answer", ""))}

    graph = StateGraph(TeamState)
    graph.add_node("route", route)
    graph.add_node("specialist", specialist)  # type: ignore[arg-type]
    graph.add_node("compose", compose)
    graph.add_node("guard", guard)
    graph.add_edge(START, "route")
    graph.add_conditional_edges("route", dispatch, ["specialist"])
    graph.add_edge("specialist", "compose")
    graph.add_edge("compose", "guard")
    graph.add_edge("guard", END)
    return graph.compile()


def safety_guard(ctx: RaceContext, answer: str) -> str:
    """Deterministic rules after the model: today's illness or pain always gets the
    rest-and-professional line, whatever the model wrote."""
    today = next((c for c in ctx.checkins if str(c.get("day")) == ctx.today.isoformat()), None)
    if not today or not answer:
        return answer
    lower = answer.lower()
    if today.get("illness") and not (
        "rest" in lower and ("doctor" in lower or "professional" in lower)
    ):
        return answer + (
            "\n\nYou reported feeling ill today: rest, and see a doctor if you have a fever, "
            "chest symptoms, or it lasts more than a few days."
        )
    if today.get("pain_note") and not (
        "physio" in lower or "professional" in lower or "doctor" in lower
    ):
        return answer + (
            "\n\nYou noted pain today: don't train through it, and see a physio or doctor "
            "if it changes how you move or lasts more than a few days."
        )
    return answer


async def team_answer(
    ai: LangChainRaceAI, ctx: RaceContext, question: str, turns: list[dict[str, str]]
) -> str:
    """Run the graph for one chat turn; `turns` are the stored previous messages."""
    result = await build_team(ai, ctx).ainvoke(
        {"question": question, "history": history_messages(turns), "drafts": []}
    )
    return str(result.get("answer") or "")
