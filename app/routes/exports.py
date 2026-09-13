"""Read-only endpoints for printable slips and data export.

Everything in this module only SELECTs; nothing writes to the database.
All endpoints require a logged-in session:
  * Admin       — any event
  * School POC  — only events belonging to their own school
  * Specialists — slips for any event (they examine across camps); no bulk export
"""
import json
import logging

import psycopg2
import psycopg2.extras
from flask import Blueprint, jsonify, request, session

from app.config import Config
from app.db import get_db_conn
from app.helpers import row_to_dict

logger = logging.getLogger('aiims.exports')
bp = Blueprint('exports', __name__)


def _authorize_event(cur, event_id, allow_specialists):
    """Return (event_row, None) if the session user may read this event, else (None, response)."""
    user = session.get("user")
    if not user:
        return None, (jsonify({"error": "Login required"}), 401)

    cur.execute("SELECT * FROM Events WHERE event_id = %s", (event_id,))
    event = cur.fetchone()
    if not event:
        return None, (jsonify({"error": "Event not found"}), 404)

    role = user.get("role")
    if role == "Admin":
        return event, None
    if role == "School POC":
        cur.execute("SELECT school_id FROM Schools WHERE poc_username = %s", (user.get("username"),))
        school_ids = {r["school_id"] for r in cur.fetchall()}
        if event["school_id"] in school_ids:
            return event, None
    elif allow_specialists and role in Config.SPECIALIST_ROLES:
        return event, None

    return None, (jsonify({"error": "Unauthorized"}), 403)


def _parse_json(text):
    try:
        d = json.loads(text or "{}")
        return d if isinstance(d, dict) else {}
    except (ValueError, TypeError):
        return {}


def _parse_symptoms(text):
    try:
        raw = json.loads(text or "[]")
    except (ValueError, TypeError):
        return []
    out = []
    if isinstance(raw, list):
        for item in raw:
            if isinstance(item, dict) and "name" in item:
                out.append(str(item["name"]))
            elif isinstance(item, str):
                out.append(item)
    return out


def _status_of(d):
    return d.get("status") or d.get("assessment") or ""


@bp.route("/api/events/<int:event_id>/slips")
def api_event_slips(event_id):
    """Printable department slips: every Observation/Referral record in the event,
    each with its student and general info. Optional filters: student_id, category."""
    student_id = request.args.get("student_id", type=int)
    category = request.args.get("category", "").strip()

    with get_db_conn() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        event, err = _authorize_event(cur, event_id, allow_specialists=True)
        if err:
            return err

        conditions = ["hr.event_id = %s"]
        params = [event_id]
        if student_id:
            conditions.append("hr.student_id = %s")
            params.append(student_id)
        if category:
            conditions.append("hr.category = %s")
            params.append(category)

        cur.execute(f"""
            SELECT hr.record_id, hr.student_id, hr.category, hr.doctor_id, hr.json_data,
                   hr.timestamp, u.name AS doctor_name
            FROM Health_Records hr
            LEFT JOIN Users u ON u.username = hr.doctor_id
            WHERE {' AND '.join(conditions)}
        """, params)
        records = cur.fetchall()

        wanted = {}
        for r in records:
            d = _parse_json(r["json_data"])
            if _status_of(d) in ("O", "R"):
                wanted.setdefault(r["student_id"], []).append((r, d))

        students, general = {}, {}
        if wanted:
            ids = list(wanted.keys())
            cur.execute("SELECT * FROM Students WHERE student_id = ANY(%s)", (ids,))
            students = {s["student_id"]: row_to_dict(s) for s in cur.fetchall()}
            cur.execute(
                "SELECT student_id, height, weight, bmi FROM Student_General_Info "
                "WHERE event_id = %s AND student_id = ANY(%s)",
                (event_id, ids),
            )
            general = {g["student_id"]: row_to_dict(g) for g in cur.fetchall()}

    slips = []
    for sid, recs in wanted.items():
        stu = students.get(sid)
        if not stu:
            continue
        for r, d in recs:
            slips.append({
                "student": stu,
                "general_info": general.get(sid),
                "record": {
                    "record_id": r["record_id"],
                    "category": r["category"],
                    "doctor_id": r["doctor_id"],
                    "doctor_name": r["doctor_name"],
                    "timestamp": r["timestamp"],
                    "parsed_data": d,
                },
            })

    # Stable print order: class, section, name, then department
    slips.sort(key=lambda s: (
        str(s["student"].get("student_class") or ""),
        str(s["student"].get("section") or ""),
        str(s["student"].get("name") or "").lower(),
        str(s["record"]["category"] or ""),
    ))
    return jsonify({"camp_name": event["school_name"], "slips": slips})


def _meds_text(d):
    meds = d.get("medicines") or []
    parts = []
    if isinstance(meds, list):
        for m in meds:
            if isinstance(m, dict) and str(m.get("name", "")).strip():
                parts.append(" ".join(
                    str(m.get(k, "")).strip() for k in ("name", "dosage", "frequency", "duration")
                    if str(m.get(k, "")).strip()
                ))
    return "; ".join(parts)


def _complaints_text(d):
    """Flatten the various chief-complaint structures used by department forms."""
    out = []

    def add(items, prefix=""):
        for c in items or []:
            if isinstance(c, dict):
                side = c.get("side")
                txt = c.get("complaint", "")
                if side and side != "both":
                    txt += f" ({side[0].upper()})"
                elif side == "both":
                    txt += " (B/L)"
                out.append(prefix + txt)
            elif c:
                out.append(prefix + str(c))

    for key in ("eyeComplaints", "dentalComplaints", "skinComplaints",
                "pedComplaints", "obgComplaints", "complaints"):
        block = d.get(key)
        if isinstance(block, dict):
            add(block.get("complaints"))
            if block.get("otherComplaint"):
                out.append(str(block["otherComplaint"]))
        elif isinstance(block, list):
            add(block)
    ent = d.get("entComplaints")
    if isinstance(ent, dict):
        for part in ("ear", "nose", "throat"):
            b = ent.get(part) or {}
            add(b.get("complaints"), f"{part.title()}: ")
            if b.get("otherComplaint"):
                out.append(f"{part.title()}: {b['otherComplaint']}")
    if d.get("otherComplaint") and isinstance(d.get("otherComplaint"), str):
        out.append(d["otherComplaint"])
    return "; ".join(x for x in out if x)


def _key_findings(category, d):
    """Short department-specific findings for the export."""
    bits = []
    if category == "Eye_Specialist":
        if d.get("rightEye") or d.get("leftEye"):
            bits.append(f"Vision R {d.get('rightEye', '-')} / L {d.get('leftEye', '-')}")
        if d.get("accessories"):
            bits.append(f"Spectacles: {d['accessories']}")
    elif category == "Dental":
        teeth = (d.get("dentalComplaints") or {}).get("affectedTeeth") or []
        if teeth:
            bits.append("Teeth: " + ", ".join(str(t) for t in sorted(teeth)))
        if d.get("teethGums"):
            bits.append(str(d["teethGums"]))
    elif category == "ENT":
        for k in ("ear", "nose", "throat"):
            if d.get(k):
                bits.append(f"{k.title()}: {d[k]}")
    elif category == "Skin_Specialist":
        if d.get("skinExam"):
            bits.append(str(d["skinExam"]))
    elif category in ("Community_Medicine", "Other"):
        if d.get("presentComplaint"):
            bits.append(f"Complaint: {d['presentComplaint']}")
        if d.get("anaemia"):
            bits.append(f"Anaemia: {d['anaemia']}")
        for s in ("locomotor", "abdomen", "respiratory", "cardiovascular", "cns"):
            if d.get(s) == "Abnormal":
                bits.append(f"{s.title()}: Abnormal {d.get(s + 'Detail', '')}".strip())
    elif category == "Pediatrics":
        for k, label in (("growthFlags", "Growth"), ("deficiencySigns", "Deficiency")):
            if d.get(k):
                bits.append(f"{label}: {', '.join(d[k])}")
        if d.get("developmentalConcerns"):
            bits.append(f"Development: {d['developmentalConcerns']}")
        if d.get("immunisation"):
            bits.append(f"Immunisation: {d['immunisation']}")
        for s in ("respiratory", "cardiovascular", "abdomen", "cns"):
            if d.get(s) == "Abnormal":
                bits.append(f"{s.title()}: Abnormal {d.get(s + 'Detail', '')}".strip())
    elif category == "OBGYN":
        if d.get("menarche"):
            bits.append(f"Menarche: {d['menarche']}" + (f" (age {d['menarcheAge']})" if d.get("menarcheAge") else ""))
        for k, label in (("cycleRegularity", "Cycles"), ("hygienePractice", "Hygiene")):
            if d.get(k):
                bits.append(f"{label}: {d[k]}")
        for k, label in (("dysmenorrhoea", "Dysmenorrhoea"), ("heavyBleeding", "Heavy bleeding"),
                         ("abnormalDischarge", "Abnormal discharge")):
            if d.get(k) == "Yes":
                bits.append(label)
        if d.get("anaemia"):
            bits.append(f"Anaemia: {d['anaemia']}")
        if d.get("counselling"):
            bits.append("Counselling: " + ", ".join(d["counselling"]))
    return "; ".join(str(b) for b in bits)


STATUS_LABEL = {"N": "Normal", "O": "Observation", "R": "Referred"}


@bp.route("/api/events/<int:event_id>/export")
def api_event_export(event_id):
    """Flattened students + records for spreadsheet download. Honours class/section/gender filters."""
    student_class = request.args.get("student_class", "").strip()
    section = request.args.get("section", "").strip()
    gender = request.args.get("gender", "").strip()

    conditions = ["s.event_id = %s"]
    params = [event_id]
    if student_class:
        conditions.append("s.student_class = %s")
        params.append(student_class)
    if section:
        conditions.append("s.section = %s")
        params.append(section)
    if gender:
        conditions.append("s.gender = %s")
        params.append(gender)
    where = " AND ".join(conditions)

    with get_db_conn() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        event, err = _authorize_event(cur, event_id, allow_specialists=False)
        if err:
            return err

        cur.execute(f"""
            SELECT s.*, g.height, g.weight, g.bmi, g.symptoms_json
            FROM Students s
            LEFT JOIN Student_General_Info g
                   ON g.student_id = s.student_id AND g.event_id = s.event_id
            WHERE {where}
            ORDER BY s.student_class, s.section, s.name
        """, params)
        student_rows = cur.fetchall()

        cur.execute(f"""
            SELECT hr.record_id, hr.student_id, hr.category, hr.doctor_id, hr.json_data,
                   hr.timestamp, u.name AS doctor_name
            FROM Health_Records hr
            JOIN Students s ON s.student_id = hr.student_id
            LEFT JOIN Users u ON u.username = hr.doctor_id
            WHERE hr.event_id = %s AND {where}
            ORDER BY hr.timestamp
        """, [event_id] + params)
        record_rows = cur.fetchall()

    by_student = {}
    records = []
    for r in record_rows:
        d = _parse_json(r["json_data"])
        by_student.setdefault(r["student_id"], []).append((r["category"], d))

    students_out = []
    stu_lookup = {}
    for s in student_rows:
        s = row_to_dict(s)
        stu_lookup[s["student_id"]] = s
        dept_status = {}
        bp_text = ""
        for cat, d in by_student.get(s["student_id"], []):
            dept_status[cat] = STATUS_LABEL.get(_status_of(d), "Examined")
            if d.get("bpSystolic") or d.get("bpDiastolic"):
                bp_text = f"{d.get('bpSystolic', '')}/{d.get('bpDiastolic', '')}"
        students_out.append({
            "student_id": s["student_id"],
            "registration_number": s.get("registration_number") or "",
            "name": s.get("name") or "",
            "student_class": s.get("student_class") or "",
            "section": s.get("section") or "",
            "gender": s.get("gender") or "",
            "dob": s.get("dob") or "",
            "age": s.get("age"),
            "blood_group": s.get("blood_group") or "",
            "father_name": s.get("father_name") or "",
            "father_occupation": s.get("father_occupation") or "",
            "mother_name": s.get("mother_name") or "",
            "mother_occupation": s.get("mother_occupation") or "",
            "phone": s.get("phone") or "",
            "address": s.get("address") or "",
            "pincode": s.get("pincode") or "",
            "attendance": s.get("status") or "",
            "height_cm": s.get("height") or "",
            "weight_kg": s.get("weight") or "",
            "bmi": s.get("bmi") or "",
            "bp_mmhg": bp_text,
            "symptoms": "; ".join(_parse_symptoms(s.get("symptoms_json"))),
            "departments": dept_status,
        })

    for r in record_rows:
        s = stu_lookup.get(r["student_id"], {})
        d = _parse_json(r["json_data"])
        records.append({
            "record_id": r["record_id"],
            "registration_number": s.get("registration_number") or "",
            "student_name": s.get("name") or "",
            "student_class": s.get("student_class") or "",
            "section": s.get("section") or "",
            "gender": s.get("gender") or "",
            "department": r["category"] or "",
            "doctor": r["doctor_name"] or r["doctor_id"] or "",
            "timestamp": r["timestamp"] or "",
            "status": STATUS_LABEL.get(_status_of(d), _status_of(d)),
            "chief_complaints": _complaints_text(d),
            "key_findings": _key_findings(r["category"], d),
            "bp_mmhg": f"{d.get('bpSystolic', '')}/{d.get('bpDiastolic', '')}"
                       if (d.get("bpSystolic") or d.get("bpDiastolic")) else "",
            "pulse": d.get("pulse", ""),
            "clinical_findings": d.get("clinicalFindings", ""),
            "diagnosis": d.get("diagnosis", ""),
            "medicines": _meds_text(d),
            "advice": d.get("advice", ""),
            "referral_dept": d.get("referralDept", "") if _status_of(d) == "R" else "",
            "referral_reason": d.get("referralReason", "") if _status_of(d) == "R" else "",
            "urgency": d.get("urgency", "") if _status_of(d) == "R" else "",
        })

    return jsonify({
        "event": {
            "event_id": event["event_id"],
            "school_name": event["school_name"],
            "start_date": event["start_date"],
            "end_date": event["end_date"],
        },
        "departments": Config.SPECIALIST_ROLES,
        "students": students_out,
        "records": records,
    })
