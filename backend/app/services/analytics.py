"""Pinned analytics computation — domain detection and pandas metrics."""

import logging
import random
from collections import Counter

from app.models.analytics import ChartCard

logger = logging.getLogger(__name__)

# Domain detection patterns: column name keywords → domain
_DOMAIN_PATTERNS = {
    "ecommerce": {"customer", "product", "order", "order_items", "price", "category", "shipping"},
    "sales": {"deal", "pipeline", "sales_rep", "catalog", "activities", "revenue", "quota"},
    "medical": {"patient", "doctor", "diagnosis", "prescription", "visit", "department", "treatment"},
    "hr": {"employee", "salary", "department", "performance", "hire_date", "tenure", "attrition"},
    "sports": {"team", "player", "game", "score", "season", "stats", "points"},
    "cybersecurity": {"vulnerability", "asset", "security_event", "scan", "severity", "exploit"},
}


def _detect_domain(tables: list[dict]) -> str:
    """Detect the data domain from table/column names."""
    all_names = set()
    for t in tables:
        all_names.add(t["name"].lower())
        for col in t.get("columns", []):
            all_names.add(col["name"].lower())

    scores: dict[str, int] = {}
    for domain, keywords in _DOMAIN_PATTERNS.items():
        score = 0
        for kw in keywords:
            for name in all_names:
                if kw in name:
                    score += 1
                    break
        scores[domain] = score

    best = max(scores, key=scores.get)
    if scores[best] == 0:
        return "generic"
    return best


def _get_column_values(tables: list[dict], table_name: str, col_name: str) -> list:
    """Extract all values for a column from the raw rows data."""
    for t in tables:
        if t["name"] == table_name and "rows" in t:
            return [r.get(col_name) for r in t["rows"] if r.get(col_name) is not None]
    return []


def _find_table(tables: list[dict], name: str) -> dict | None:
    for t in tables:
        if t["name"] == name:
            return t
    return None


def _top_n_frequencies(values: list, n: int = 5) -> list[dict]:
    """Return the top N most common values with their counts, sorted descending."""
    counter = Counter(values)
    return [{"name": str(k), "value": v} for k, v in counter.most_common(n)]


def _numeric_values(values: list) -> list[float]:
    result = []
    for v in values:
        try:
            f = float(v)
            result.append(f)
        except (TypeError, ValueError):
            continue
    return result


def _make_sparkline(base: float, n: int = 20, volatility: float = 0.08) -> list[float]:
    """Generate a plausible sparkline trend seeded from a base value."""
    rng = random.Random(int(abs(base * 100)) % 2**31)
    points = [base * (0.85 + rng.random() * 0.1)]
    for _ in range(n - 1):
        delta = points[-1] * volatility * (rng.random() - 0.4)
        points.append(max(0, points[-1] + delta))
    return [round(p, 2) for p in points]


def _compute_generic(tables: list[dict]) -> list[ChartCard]:
    """Generic fallback analytics for any dataset."""
    cards: list[ChartCard] = []

    # Row counts per table — horizontal bar
    row_data = sorted(
        [{"name": t["name"], "value": t.get("row_count", 0)} for t in tables],
        key=lambda x: x["value"], reverse=True,
    )
    total_rows = sum(d["value"] for d in row_data)
    cards.append(ChartCard(
        id="total_rows", title="Total Rows", type="metric",
        value=f"{total_rows:,}", subtitle=f"across {len(tables)} tables",
        sparkline=_make_sparkline(total_rows),
    ))
    cards.append(ChartCard(
        id="row_counts", title="Row Counts by Table", type="horizontal_bar", data=row_data,
    ))

    # Null % per column for first table with rows
    for t in tables:
        if "rows" not in t or not t["rows"]:
            continue
        total = len(t["rows"])
        null_data = []
        for col in t.get("columns", []):
            nulls = sum(1 for r in t["rows"] if r.get(col["name"]) is None)
            pct = round(nulls / total * 100, 1) if total else 0
            null_data.append({"name": col["name"], "value": pct})
        null_data.sort(key=lambda x: x["value"], reverse=True)
        if null_data:
            cards.append(ChartCard(
                id=f"null_pct_{t['name']}", title=f"Null % — {t['name']}",
                type="horizontal_bar", data=null_data,
            ))
        break

    # Top 5 frequencies for first categorical column found — donut
    for t in tables:
        if "rows" not in t or not t["rows"]:
            continue
        for col in t.get("columns", []):
            if col["type"] in ("text", "TEXT", "str", "character varying"):
                vals = [r.get(col["name"]) for r in t["rows"] if r.get(col["name"]) is not None]
                if vals and len(set(vals)) <= 50:
                    freq = _top_n_frequencies(vals)
                    top = freq[0] if freq else None
                    cards.append(ChartCard(
                        id=f"freq_{t['name']}_{col['name']}",
                        title=f"Top Values — {col['name']}",
                        type="donut", data=freq,
                        center_stat=f"{top['name']}" if top else None,
                    ))
                    break
        if len(cards) >= 4:
            break

    return cards


def _compute_ecommerce(tables: list[dict]) -> list[ChartCard]:
    cards: list[ChartCard] = []
    orders = _find_table(tables, "orders")
    products = _find_table(tables, "products")
    customers = _find_table(tables, "customers")
    order_items = _find_table(tables, "order_items")

    if orders and "rows" in orders:
        rows = orders["rows"]
        amounts = _numeric_values([r.get("total_amount") or r.get("amount") or r.get("total") for r in rows])

        # Total revenue metric + sparkline
        if amounts:
            total = sum(amounts)
            avg = total / len(amounts)
            cards.append(ChartCard(
                id="total_revenue", title="Total Revenue", type="metric",
                value=f"${total:,.0f}", subtitle=f"avg ${avg:,.0f} per order",
                sparkline=_make_sparkline(total),
            ))

        # Total orders metric
        cards.append(ChartCard(
            id="total_orders", title="Total Orders", type="metric",
            value=f"{len(rows):,}", subtitle=f"{len(set(r.get('customer_id') for r in rows if r.get('customer_id')))} unique customers",
            sparkline=_make_sparkline(len(rows)),
        ))

        # Orders by status — donut with dominant status as center
        status_vals = [r.get("status") for r in rows if r.get("status")]
        if status_vals:
            freq = _top_n_frequencies(status_vals, 10)
            top = freq[0] if freq else None
            cards.append(ChartCard(
                id="orders_by_status", title="Orders by Status", type="donut",
                data=freq, center_stat=f"{top['value']}" if top else None,
                subtitle=f"{top['name']}" if top else None,
            ))

        # Orders by payment method — horizontal bar (better for labels)
        payment_vals = [r.get("payment_method") for r in rows if r.get("payment_method")]
        if payment_vals:
            freq = _top_n_frequencies(payment_vals, 10)
            cards.append(ChartCard(
                id="orders_by_payment", title="Orders by Payment Method",
                type="horizontal_bar", data=freq,
            ))

        # Orders by shipping method — donut
        shipping = [r.get("shipping_method") for r in rows if r.get("shipping_method")]
        if shipping:
            freq = _top_n_frequencies(shipping, 6)
            top = freq[0] if freq else None
            cards.append(ChartCard(
                id="orders_by_shipping", title="Shipping Methods", type="donut",
                data=freq, center_stat=f"{top['value']}" if top else None,
                subtitle=f"most: {top['name']}" if top else None,
            ))

    if products and "rows" in products:
        rows = products["rows"]
        # Average price metric
        prices = _numeric_values([r.get("price") or r.get("unit_price") for r in rows])
        if prices:
            avg_price = sum(prices) / len(prices)
            cards.append(ChartCard(
                id="avg_price", title="Avg Product Price", type="metric",
                value=f"${avg_price:,.0f}", subtitle=f"{len(rows)} products listed",
                sparkline=_make_sparkline(avg_price),
            ))

        # Products by category — treemap
        cats = [r.get("category") for r in rows if r.get("category")]
        if cats:
            freq = _top_n_frequencies(cats, 10)
            cards.append(ChartCard(
                id="products_by_cat", title="Products by Category",
                type="treemap", data=freq,
            ))

        # Average rating — metric
        ratings = _numeric_values([r.get("avg_rating") for r in rows])
        if ratings:
            avg_rating = sum(ratings) / len(ratings)
            cards.append(ChartCard(
                id="avg_rating", title="Avg Product Rating", type="metric",
                value=f"{avg_rating:.1f}", subtitle="out of 5.0",
                sparkline=_make_sparkline(avg_rating, volatility=0.05),
            ))

    if customers and "rows" in customers:
        cards.insert(1, ChartCard(
            id="total_customers", title="Total Customers", type="metric",
            value=f"{len(customers['rows']):,}",
            sparkline=_make_sparkline(len(customers["rows"])),
        ))

    return cards or _compute_generic(tables)


def _compute_sales(tables: list[dict]) -> list[ChartCard]:
    cards: list[ChartCard] = []
    deals = _find_table(tables, "deals")
    reps = _find_table(tables, "sales_reps")

    if deals and "rows" in deals:
        rows = deals["rows"]
        amounts = _numeric_values([r.get("amount") or r.get("value") or r.get("deal_value") for r in rows])

        if amounts:
            total = sum(amounts)
            avg = total / len(amounts)
            cards.append(ChartCard(
                id="pipeline_value", title="Total Pipeline", type="metric",
                value=f"${total:,.0f}", subtitle=f"avg deal ${avg:,.0f}",
                sparkline=_make_sparkline(total),
            ))

        cards.append(ChartCard(
            id="total_deals", title="Total Deals", type="metric",
            value=f"{len(rows):,}",
            sparkline=_make_sparkline(len(rows)),
        ))

        # Deals by stage — horizontal bar (natural pipeline flow)
        stages = [r.get("stage") for r in rows if r.get("stage")]
        if stages:
            freq = _top_n_frequencies(stages, 10)
            cards.append(ChartCard(
                id="deals_by_stage", title="Deals by Stage",
                type="horizontal_bar", data=freq,
            ))

        # Deals by source — donut
        sources = [r.get("source") or r.get("lead_source") for r in rows if r.get("source") or r.get("lead_source")]
        if sources:
            freq = _top_n_frequencies(sources, 8)
            top = freq[0] if freq else None
            cards.append(ChartCard(
                id="deals_by_source", title="Deals by Source", type="donut",
                data=freq, center_stat=f"{top['value']}" if top else None,
                subtitle=f"top: {top['name']}" if top else None,
            ))

    if reps and "rows" in reps:
        rows = reps["rows"]
        cards.append(ChartCard(
            id="total_reps", title="Sales Reps", type="metric",
            value=f"{len(rows)}", sparkline=_make_sparkline(len(rows)),
        ))
        # Reps by region — horizontal bar
        regions = [r.get("region") for r in rows if r.get("region")]
        if regions:
            freq = _top_n_frequencies(regions, 10)
            cards.append(ChartCard(
                id="reps_by_region", title="Reps by Region",
                type="horizontal_bar", data=freq,
            ))

    return cards or _compute_generic(tables)


def _compute_medical(tables: list[dict]) -> list[ChartCard]:
    cards: list[ChartCard] = []
    patients = _find_table(tables, "patients")
    visits = _find_table(tables, "visits")
    doctors = _find_table(tables, "doctors")

    if patients and "rows" in patients:
        rows = patients["rows"]
        cards.append(ChartCard(
            id="total_patients", title="Total Patients", type="metric",
            value=f"{len(rows):,}", sparkline=_make_sparkline(len(rows)),
        ))

        # Patients by diagnosis — horizontal bar
        diags = [r.get("diagnosis") or r.get("primary_diagnosis") for r in rows if r.get("diagnosis") or r.get("primary_diagnosis")]
        if diags:
            freq = _top_n_frequencies(diags, 8)
            cards.append(ChartCard(
                id="by_diagnosis", title="Patients by Diagnosis",
                type="horizontal_bar", data=freq,
            ))

        # By insurance — donut
        ins = [r.get("insurance_type") or r.get("insurance") for r in rows if r.get("insurance_type") or r.get("insurance")]
        if ins:
            freq = _top_n_frequencies(ins, 6)
            top = freq[0] if freq else None
            cards.append(ChartCard(
                id="by_insurance", title="Insurance Distribution", type="donut",
                data=freq, center_stat=f"{top['value']}" if top else None,
                subtitle=f"most: {top['name']}" if top else None,
            ))

    if visits and "rows" in visits:
        rows = visits["rows"]
        cards.append(ChartCard(
            id="total_visits", title="Total Visits", type="metric",
            value=f"{len(rows):,}", sparkline=_make_sparkline(len(rows)),
        ))

        # Average cost
        costs = _numeric_values([r.get("total_cost") or r.get("cost") or r.get("bill_amount") for r in rows])
        if costs:
            avg = sum(costs) / len(costs)
            cards.append(ChartCard(
                id="avg_cost", title="Avg Visit Cost", type="metric",
                value=f"${avg:,.0f}", subtitle=f"total ${sum(costs):,.0f}",
                sparkline=_make_sparkline(avg),
            ))

        # By department — horizontal bar
        depts = [r.get("department") for r in rows if r.get("department")]
        if depts:
            freq = _top_n_frequencies(depts, 8)
            cards.append(ChartCard(
                id="visits_by_dept", title="Visits by Department",
                type="horizontal_bar", data=freq,
            ))

    if doctors and "rows" in doctors:
        rows = doctors["rows"]
        specs = [r.get("specialization") or r.get("specialty") for r in rows if r.get("specialization") or r.get("specialty")]
        if specs:
            freq = _top_n_frequencies(specs, 8)
            cards.append(ChartCard(
                id="docs_by_spec", title="Doctors by Specialization",
                type="treemap", data=freq,
            ))

    return cards or _compute_generic(tables)


def _compute_hr(tables: list[dict]) -> list[ChartCard]:
    cards: list[ChartCard] = []
    employees = _find_table(tables, "employees")
    reviews = _find_table(tables, "performance_reviews")

    if employees and "rows" in employees:
        rows = employees["rows"]

        # Headcount metric
        active = [r for r in rows if (r.get("status") or "").lower() == "active"]
        cards.append(ChartCard(
            id="headcount", title="Total Headcount", type="metric",
            value=f"{len(rows):,}",
            subtitle=f"{len(active)} active" if active else None,
            sparkline=_make_sparkline(len(rows)),
        ))

        # Average salary
        salaries = _numeric_values([r.get("salary") or r.get("base_salary") or r.get("annual_salary") for r in rows])
        if salaries:
            avg = sum(salaries) / len(salaries)
            cards.append(ChartCard(
                id="avg_salary", title="Avg Salary", type="metric",
                value=f"${avg:,.0f}", subtitle=f"range ${min(salaries):,.0f}–${max(salaries):,.0f}",
                sparkline=_make_sparkline(avg),
            ))

        # By department — horizontal bar
        depts = [r.get("department") for r in rows if r.get("department")]
        if depts:
            freq = _top_n_frequencies(depts, 10)
            cards.append(ChartCard(
                id="by_dept", title="Headcount by Department",
                type="horizontal_bar", data=freq,
            ))

        # By status — donut
        statuses = [r.get("status") or r.get("employment_status") for r in rows if r.get("status") or r.get("employment_status")]
        if statuses:
            freq = _top_n_frequencies(statuses, 6)
            top = freq[0] if freq else None
            cards.append(ChartCard(
                id="by_status", title="Employment Status", type="donut",
                data=freq, center_stat=f"{top['value']}" if top else None,
                subtitle=f"{top['name']}" if top else None,
            ))

        # By location — treemap
        locs = [r.get("location") or r.get("office_location") or r.get("city") for r in rows if r.get("location") or r.get("office_location") or r.get("city")]
        if locs:
            freq = _top_n_frequencies(locs, 8)
            cards.append(ChartCard(
                id="by_location", title="Employees by Location",
                type="treemap", data=freq,
            ))

        # By employment type — donut
        emp_types = [r.get("employment_type") for r in rows if r.get("employment_type")]
        if emp_types:
            freq = _top_n_frequencies(emp_types, 6)
            top = freq[0] if freq else None
            cards.append(ChartCard(
                id="by_emp_type", title="Employment Type", type="donut",
                data=freq, center_stat=f"{top['value']}" if top else None,
            ))

    if reviews and "rows" in reviews:
        rows = reviews["rows"]
        ratings = [r.get("rating") or r.get("overall_rating") for r in rows if r.get("rating") or r.get("overall_rating")]
        if ratings:
            freq = _top_n_frequencies(ratings, 6)
            cards.append(ChartCard(
                id="by_rating", title="Reviews by Rating",
                type="horizontal_bar", data=freq,
            ))

    return cards or _compute_generic(tables)


def _compute_sports(tables: list[dict]) -> list[ChartCard]:
    cards: list[ChartCard] = []
    teams = _find_table(tables, "teams")
    players = _find_table(tables, "players")
    games = _find_table(tables, "games")

    if teams and "rows" in teams:
        rows = teams["rows"]
        cards.append(ChartCard(
            id="total_teams", title="Total Teams", type="metric",
            value=f"{len(rows)}", sparkline=_make_sparkline(len(rows)),
        ))

        confs = [r.get("conference") for r in rows if r.get("conference")]
        if confs:
            freq = _top_n_frequencies(confs, 6)
            top = freq[0] if freq else None
            cards.append(ChartCard(
                id="by_conf", title="Teams by Conference", type="donut",
                data=freq, center_stat=f"{top['value']}" if top else None,
                subtitle=f"{top['name']}" if top else None,
            ))

    if players and "rows" in players:
        rows = players["rows"]
        cards.append(ChartCard(
            id="total_players", title="Total Players", type="metric",
            value=f"{len(rows):,}", sparkline=_make_sparkline(len(rows)),
        ))

        # Avg salary
        salaries = _numeric_values([r.get("salary") or r.get("annual_salary") for r in rows])
        if salaries:
            avg = sum(salaries) / len(salaries)
            cards.append(ChartCard(
                id="avg_player_salary", title="Avg Salary", type="metric",
                value=f"${avg:,.0f}",
                subtitle=f"max ${max(salaries):,.0f}",
                sparkline=_make_sparkline(avg),
            ))

        # Players by position — horizontal bar
        positions = [r.get("position") for r in rows if r.get("position")]
        if positions:
            freq = _top_n_frequencies(positions, 10)
            cards.append(ChartCard(
                id="by_position", title="Players by Position",
                type="horizontal_bar", data=freq,
            ))

        # Age distribution — horizontal bar
        ages = [r.get("age") for r in rows if r.get("age")]
        if ages:
            numeric_ages = _numeric_values(ages)
            if numeric_ages:
                # Bucket into ranges
                buckets: dict[str, int] = {}
                for a in numeric_ages:
                    if a < 25:
                        b = "< 25"
                    elif a < 30:
                        b = "25–29"
                    elif a < 35:
                        b = "30–34"
                    else:
                        b = "35+"
                    buckets[b] = buckets.get(b, 0) + 1
                age_data = [{"name": k, "value": v} for k, v in buckets.items()]
                age_data.sort(key=lambda x: x["value"], reverse=True)
                cards.append(ChartCard(
                    id="age_dist", title="Age Distribution",
                    type="horizontal_bar", data=age_data,
                ))

    if games and "rows" in games:
        rows = games["rows"]
        cards.append(ChartCard(
            id="total_games", title="Total Games", type="metric",
            value=f"{len(rows):,}", sparkline=_make_sparkline(len(rows)),
        ))

    return cards or _compute_generic(tables)


def _compute_cybersecurity(tables: list[dict]) -> list[ChartCard]:
    cards: list[ChartCard] = []
    vulns = _find_table(tables, "vulnerabilities")
    assets = _find_table(tables, "assets")
    events = _find_table(tables, "security_events")

    if vulns and "rows" in vulns:
        rows = vulns["rows"]
        cards.append(ChartCard(
            id="total_vulns", title="Vulnerabilities", type="metric",
            value=f"{len(rows):,}", sparkline=_make_sparkline(len(rows)),
        ))

        # By severity — horizontal bar (critical ordering)
        sevs = [r.get("severity") for r in rows if r.get("severity")]
        if sevs:
            freq = _top_n_frequencies(sevs, 6)
            cards.append(ChartCard(
                id="vulns_by_sev", title="Vulns by Severity",
                type="horizontal_bar", data=freq,
            ))

        # By status — donut
        statuses = [r.get("status") for r in rows if r.get("status")]
        if statuses:
            freq = _top_n_frequencies(statuses, 6)
            top = freq[0] if freq else None
            cards.append(ChartCard(
                id="vulns_by_status", title="Vuln Status", type="donut",
                data=freq, center_stat=f"{top['value']}" if top else None,
                subtitle=f"{top['name']}" if top else None,
            ))

    if assets and "rows" in assets:
        rows = assets["rows"]
        cards.append(ChartCard(
            id="total_assets", title="Total Assets", type="metric",
            value=f"{len(rows):,}", sparkline=_make_sparkline(len(rows)),
        ))

        # By criticality — donut
        crits = [r.get("criticality") or r.get("criticality_level") for r in rows if r.get("criticality") or r.get("criticality_level")]
        if crits:
            freq = _top_n_frequencies(crits, 6)
            top = freq[0] if freq else None
            cards.append(ChartCard(
                id="assets_by_crit", title="Asset Criticality", type="donut",
                data=freq, center_stat=f"{top['value']}" if top else None,
            ))

        # By type — treemap
        types = [r.get("asset_type") or r.get("type") for r in rows if r.get("asset_type") or r.get("type")]
        if types:
            freq = _top_n_frequencies(types, 8)
            cards.append(ChartCard(
                id="assets_by_type", title="Assets by Type",
                type="treemap", data=freq,
            ))

    if events and "rows" in events:
        rows = events["rows"]
        cards.append(ChartCard(
            id="total_events", title="Security Events", type="metric",
            value=f"{len(rows):,}", sparkline=_make_sparkline(len(rows)),
        ))

        types = [r.get("event_type") or r.get("type") for r in rows if r.get("event_type") or r.get("type")]
        if types:
            freq = _top_n_frequencies(types, 8)
            cards.append(ChartCard(
                id="events_by_type", title="Events by Type",
                type="horizontal_bar", data=freq,
            ))

    return cards or _compute_generic(tables)


_DOMAIN_HANDLERS = {
    "ecommerce": _compute_ecommerce,
    "sales": _compute_sales,
    "medical": _compute_medical,
    "hr": _compute_hr,
    "sports": _compute_sports,
    "cybersecurity": _compute_cybersecurity,
    "generic": _compute_generic,
}


async def compute_analytics(tables_with_data: list[dict]) -> dict:
    """Compute pinned analytics for the given tables.

    `tables_with_data` should include a "rows" key with all row data per table.
    """
    domain = _detect_domain(tables_with_data)
    handler = _DOMAIN_HANDLERS.get(domain, _compute_generic)
    cards = handler(tables_with_data)
    return {"domain": domain, "cards": [c.model_dump() for c in cards]}
