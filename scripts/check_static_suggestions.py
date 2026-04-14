#!/usr/bin/env python3

import csv
import json
import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATASETS_DIR = ROOT / "datasets"


SUGGESTION_SQL: dict[str, list[tuple[str, str]]] = {
    "customers": [
        (
            "Top 10 customers by total spend",
            """
            SELECT c.customer_id, c.first_name, c.last_name, ROUND(SUM(o.total_amount), 2) AS total_spend
            FROM customers c
            JOIN orders o ON o.customer_id = c.customer_id
            GROUP BY c.customer_id, c.first_name, c.last_name
            ORDER BY total_spend DESC
            LIMIT 10
            """,
        ),
        (
            "Customer count by membership tier",
            """
            SELECT membership_tier, COUNT(*) AS customer_count
            FROM customers
            GROUP BY membership_tier
            ORDER BY customer_count DESC
            """,
        ),
        (
            "New signups per month in 2024",
            """
            SELECT SUBSTR(signup_date, 1, 7) AS signup_month, COUNT(*) AS signups
            FROM customers
            WHERE SUBSTR(signup_date, 1, 4) = '2024'
            GROUP BY signup_month
            ORDER BY signup_month
            """,
        ),
    ],
    "products": [
        (
            "Top 5 highest rated products",
            """
            SELECT product_name, category, avg_rating
            FROM products
            ORDER BY avg_rating DESC, review_count DESC
            LIMIT 5
            """,
        ),
        (
            "Average price by category",
            """
            SELECT category, ROUND(AVG(price), 2) AS avg_price
            FROM products
            GROUP BY category
            ORDER BY avg_price DESC
            """,
        ),
        (
            "Products with low stock (< 20)",
            """
            SELECT product_name, category, stock_quantity
            FROM products
            WHERE stock_quantity < 20
            ORDER BY stock_quantity ASC, product_name
            """,
        ),
    ],
    "orders": [
        (
            "Monthly revenue trend",
            """
            SELECT SUBSTR(order_date, 1, 7) AS order_month, ROUND(SUM(total_amount), 2) AS revenue
            FROM orders
            GROUP BY order_month
            ORDER BY order_month
            """,
        ),
        (
            "Orders by payment method",
            """
            SELECT payment_method, COUNT(*) AS order_count
            FROM orders
            GROUP BY payment_method
            ORDER BY order_count DESC
            """,
        ),
        (
            "Average order value by shipping method",
            """
            SELECT shipping_method, ROUND(AVG(total_amount), 2) AS avg_order_value
            FROM orders
            GROUP BY shipping_method
            ORDER BY avg_order_value DESC
            """,
        ),
    ],
    "ecommerce_orders": [
        (
            "Monthly revenue trend",
            """
            SELECT SUBSTR(order_date, 1, 7) AS order_month, ROUND(SUM(total_amount), 2) AS revenue
            FROM ecommerce_orders
            GROUP BY order_month
            ORDER BY order_month
            """,
        ),
        (
            "Orders by payment method",
            """
            SELECT payment_method, COUNT(*) AS order_count
            FROM ecommerce_orders
            GROUP BY payment_method
            ORDER BY order_count DESC
            """,
        ),
        (
            "Average order value by shipping method",
            """
            SELECT shipping_method, ROUND(AVG(total_amount), 2) AS avg_order_value
            FROM ecommerce_orders
            GROUP BY shipping_method
            ORDER BY avg_order_value DESC
            """,
        ),
    ],
    "order_items": [
        (
            "Best selling products by quantity",
            """
            SELECT p.product_name, SUM(oi.quantity) AS total_quantity
            FROM order_items oi
            JOIN products p ON p.product_id = oi.product_id
            GROUP BY p.product_name
            ORDER BY total_quantity DESC
            LIMIT 10
            """,
        ),
        (
            "Revenue by product category",
            """
            SELECT p.category, ROUND(SUM(oi.line_total), 2) AS revenue
            FROM order_items oi
            JOIN products p ON p.product_id = oi.product_id
            GROUP BY p.category
            ORDER BY revenue DESC
            """,
        ),
        (
            "Average discount per order",
            """
            SELECT oi.order_id, ROUND(AVG(oi.discount), 2) AS avg_discount
            FROM order_items oi
            GROUP BY oi.order_id
            ORDER BY avg_discount DESC
            LIMIT 20
            """,
        ),
    ],
    "teams": [
        (
            "Teams in the Western conference",
            """
            SELECT team_name, city
            FROM teams
            WHERE conference = 'Western'
            ORDER BY team_name
            """,
        ),
    ],
    "players": [
        (
            "Highest paid players by position",
            """
            SELECT position, first_name || ' ' || last_name AS player_name, salary
            FROM (
                SELECT *, ROW_NUMBER() OVER (PARTITION BY position ORDER BY salary DESC) AS rn
                FROM players
            ) ranked
            WHERE rn = 1
            ORDER BY salary DESC
            """,
        ),
        (
            "Average salary by team",
            """
            SELECT t.team_name, ROUND(AVG(p.salary), 2) AS avg_salary
            FROM players p
            JOIN teams t ON t.team_id = p.team_id
            GROUP BY t.team_name
            ORDER BY avg_salary DESC
            """,
        ),
        (
            "Players with 10+ years experience",
            """
            SELECT first_name, last_name, position, years_experience
            FROM players
            WHERE years_experience >= 10
            ORDER BY years_experience DESC, last_name
            """,
        ),
    ],
    "games": [
        (
            "Highest scoring games this season",
            """
            SELECT game_id, game_date, home_score + away_score AS total_points
            FROM games
            ORDER BY total_points DESC, game_date DESC
            LIMIT 10
            """,
        ),
        (
            "Average attendance by team",
            """
            SELECT t.team_name, ROUND(AVG(g.attendance), 2) AS avg_attendance
            FROM games g
            JOIN teams t ON t.team_id = g.home_team_id
            GROUP BY t.team_name
            ORDER BY avg_attendance DESC
            """,
        ),
        (
            "Home win percentage per team",
            """
            SELECT t.team_name,
                   ROUND(100.0 * AVG(CASE WHEN g.home_score > g.away_score THEN 1.0 ELSE 0.0 END), 2) AS home_win_pct
            FROM games g
            JOIN teams t ON t.team_id = g.home_team_id
            GROUP BY t.team_name
            ORDER BY home_win_pct DESC
            """,
        ),
    ],
    "player_stats": [
        (
            "Top scorers this season",
            """
            SELECT p.first_name || ' ' || p.last_name AS player_name, ROUND(AVG(ps.points), 2) AS points_per_game
            FROM player_stats ps
            JOIN players p ON p.player_id = ps.player_id
            GROUP BY p.player_id, player_name
            ORDER BY points_per_game DESC
            LIMIT 10
            """,
        ),
        (
            "Points per game ranking",
            """
            SELECT p.first_name || ' ' || p.last_name AS player_name, ROUND(AVG(ps.points), 2) AS points_per_game
            FROM player_stats ps
            JOIN players p ON p.player_id = ps.player_id
            GROUP BY p.player_id, player_name
            ORDER BY points_per_game DESC
            LIMIT 25
            """,
        ),
    ],
    "doctors": [
        (
            "Doctors by specialization",
            """
            SELECT specialization, COUNT(*) AS doctor_count
            FROM doctors
            GROUP BY specialization
            ORDER BY doctor_count DESC
            """,
        ),
        (
            "Most experienced doctors",
            """
            SELECT doctor_name, specialization, years_experience
            FROM doctors
            ORDER BY years_experience DESC, doctor_name
            LIMIT 10
            """,
        ),
    ],
    "patients": [
        (
            "Patient count by diagnosis",
            """
            SELECT primary_diagnosis, COUNT(*) AS patient_count
            FROM patients
            GROUP BY primary_diagnosis
            ORDER BY patient_count DESC
            """,
        ),
        (
            "Age distribution of patients",
            """
            SELECT CASE
                     WHEN age < 18 THEN 'Under 18'
                     WHEN age < 30 THEN '18-29'
                     WHEN age < 45 THEN '30-44'
                     WHEN age < 60 THEN '45-59'
                     ELSE '60+'
                   END AS age_band,
                   COUNT(*) AS patient_count
            FROM patients
            GROUP BY age_band
            ORDER BY patient_count DESC
            """,
        ),
        (
            "Patients by insurance type",
            """
            SELECT insurance_type, COUNT(*) AS patient_count
            FROM patients
            GROUP BY insurance_type
            ORDER BY patient_count DESC
            """,
        ),
    ],
    "visits": [
        (
            "Average length of stay by department",
            """
            SELECT department, ROUND(AVG(length_of_stay_days), 2) AS avg_stay_days
            FROM visits
            GROUP BY department
            ORDER BY avg_stay_days DESC
            """,
        ),
        (
            "Total cost by visit type",
            """
            SELECT visit_type, ROUND(SUM(total_cost), 2) AS total_cost
            FROM visits
            GROUP BY visit_type
            ORDER BY total_cost DESC
            """,
        ),
        (
            "Monthly admission trends",
            """
            SELECT SUBSTR(admission_date, 1, 7) AS admission_month, COUNT(*) AS admissions
            FROM visits
            GROUP BY admission_month
            ORDER BY admission_month
            """,
        ),
    ],
    "prescriptions": [
        (
            "Most prescribed medications",
            """
            SELECT medication, COUNT(*) AS prescription_count
            FROM prescriptions
            GROUP BY medication
            ORDER BY prescription_count DESC
            LIMIT 10
            """,
        ),
        (
            "Prescriptions per doctor",
            """
            SELECT d.doctor_name, COUNT(*) AS prescription_count
            FROM prescriptions p
            JOIN doctors d ON d.doctor_id = p.doctor_id
            GROUP BY d.doctor_name
            ORDER BY prescription_count DESC
            """,
        ),
    ],
    "sales_reps": [
        (
            "Top reps by region",
            """
            SELECT region, rep_name, base_salary
            FROM (
                SELECT *, ROW_NUMBER() OVER (PARTITION BY region ORDER BY base_salary DESC) AS rn
                FROM sales_reps
            ) ranked
            WHERE rn = 1
            ORDER BY base_salary DESC
            """,
        ),
        (
            "Rep count by seniority level",
            """
            SELECT level, COUNT(*) AS rep_count
            FROM sales_reps
            GROUP BY level
            ORDER BY rep_count DESC
            """,
        ),
    ],
    "catalog": [
        (
            "Most expensive products in catalog",
            """
            SELECT product_name, category, list_price
            FROM catalog
            ORDER BY list_price DESC
            LIMIT 10
            """,
        ),
        (
            "Products by category",
            """
            SELECT category, COUNT(*) AS product_count
            FROM catalog
            GROUP BY category
            ORDER BY product_count DESC
            """,
        ),
    ],
    "deals": [
        (
            "Total pipeline value by stage",
            """
            SELECT stage, ROUND(SUM(deal_amount), 2) AS pipeline_value
            FROM deals
            GROUP BY stage
            ORDER BY pipeline_value DESC
            """,
        ),
        (
            "Win rate by deal source",
            """
            SELECT source,
                   ROUND(100.0 * AVG(CASE WHEN stage = 'Closed Won' THEN 1.0 ELSE 0.0 END), 2) AS win_rate_pct
            FROM deals
            GROUP BY source
            ORDER BY win_rate_pct DESC
            """,
        ),
        (
            "Average deal size by product category",
            """
            SELECT c.category, ROUND(AVG(d.deal_amount), 2) AS avg_deal_amount
            FROM deals d
            JOIN catalog c ON c.product_id = d.product_id
            GROUP BY c.category
            ORDER BY avg_deal_amount DESC
            """,
        ),
    ],
    "activities": [
        (
            "Activity count by type",
            """
            SELECT activity_type, COUNT(*) AS activity_count
            FROM activities
            GROUP BY activity_type
            ORDER BY activity_count DESC
            """,
        ),
        (
            "Average call duration by rep",
            """
            SELECT sr.rep_name, ROUND(AVG(a.duration_minutes), 2) AS avg_call_duration
            FROM activities a
            JOIN sales_reps sr ON sr.rep_id = a.rep_id
            WHERE a.activity_type = 'Call'
            GROUP BY sr.rep_name
            ORDER BY avg_call_duration DESC
            """,
        ),
    ],
    "assets": [
        (
            "Assets by criticality level",
            """
            SELECT criticality, COUNT(*) AS asset_count
            FROM assets
            GROUP BY criticality
            ORDER BY asset_count DESC
            """,
        ),
        (
            "Online vs offline assets",
            """
            SELECT status, COUNT(*) AS asset_count
            FROM assets
            GROUP BY status
            ORDER BY asset_count DESC
            """,
        ),
    ],
    "vulnerabilities": [
        (
            "Vulnerability count by severity",
            """
            SELECT severity, COUNT(*) AS vulnerability_count
            FROM vulnerabilities
            GROUP BY severity
            ORDER BY vulnerability_count DESC
            """,
        ),
    ],
    "security_events": [
        (
            "Top 10 source IPs by event count",
            """
            SELECT source_ip, COUNT(*) AS event_count
            FROM security_events
            GROUP BY source_ip
            ORDER BY event_count DESC
            LIMIT 10
            """,
        ),
        (
            "Alert status breakdown",
            """
            SELECT status, COUNT(*) AS event_count
            FROM security_events
            GROUP BY status
            ORDER BY event_count DESC
            """,
        ),
    ],
    "scan_results": [
        (
            "Open findings by severity",
            """
            SELECT v.severity, COUNT(*) AS finding_count
            FROM scan_results sr
            JOIN vulnerabilities v ON v.vuln_id = sr.vuln_id
            WHERE sr.finding_status = 'Open'
            GROUP BY v.severity
            ORDER BY finding_count DESC
            """,
        ),
        (
            "Remediation action distribution",
            """
            SELECT remediation_action, COUNT(*) AS finding_count
            FROM scan_results
            GROUP BY remediation_action
            ORDER BY finding_count DESC
            """,
        ),
    ],
    "employees": [
        (
            "Headcount by department",
            """
            SELECT department, COUNT(*) AS employee_count
            FROM employees
            GROUP BY department
            ORDER BY employee_count DESC
            """,
        ),
        (
            "Average salary by location",
            """
            SELECT location, ROUND(AVG(salary), 2) AS avg_salary
            FROM employees
            GROUP BY location
            ORDER BY avg_salary DESC
            """,
        ),
        (
            "Top 5 highest paid employees",
            """
            SELECT first_name, last_name, department, salary
            FROM employees
            ORDER BY salary DESC
            LIMIT 5
            """,
        ),
    ],
    "performance_reviews": [
        (
            "Average rating by department",
            """
            SELECT e.department, ROUND(AVG(pr.rating), 2) AS avg_rating
            FROM performance_reviews pr
            JOIN employees e ON e.employee_id = pr.employee_id
            GROUP BY e.department
            ORDER BY avg_rating DESC
            """,
        ),
        (
            "Employees with Outstanding reviews",
            """
            SELECT e.first_name, e.last_name, pr.review_period, pr.rating
            FROM performance_reviews pr
            JOIN employees e ON e.employee_id = pr.employee_id
            WHERE pr.assessment = 'Outstanding'
            ORDER BY pr.rating DESC, e.last_name
            """,
        ),
    ],
    "salary_history": [
        (
            "Biggest salary increases",
            """
            SELECT e.first_name, e.last_name, ROUND(sh.new_salary - sh.old_salary, 2) AS salary_increase
            FROM salary_history sh
            JOIN employees e ON e.employee_id = sh.employee_id
            ORDER BY salary_increase DESC
            LIMIT 10
            """,
        ),
        (
            "Promotions per year",
            """
            SELECT SUBSTR(effective_date, 1, 4) AS year, COUNT(*) AS promotion_count
            FROM salary_history
            WHERE change_reason = 'Promotion'
            GROUP BY year
            ORDER BY year
            """,
        ),
    ],
    "restaurant_orders": [
        (
            "Orders by table number",
            """
            SELECT table_number, COUNT(*) AS order_count
            FROM restaurant_orders
            GROUP BY table_number
            ORDER BY order_count DESC, table_number
            """,
        ),
        (
            "Average order total",
            """
            SELECT ROUND(AVG(total), 2) AS avg_order_total
            FROM restaurant_orders
            """,
        ),
        (
            "Orders by payment method",
            """
            SELECT payment_method, COUNT(*) AS order_count
            FROM restaurant_orders
            GROUP BY payment_method
            ORDER BY order_count DESC
            """,
        ),
    ],
    "students": [
        (
            "Student count by major",
            """
            SELECT major, COUNT(*) AS student_count
            FROM students
            GROUP BY major
            ORDER BY student_count DESC
            """,
        ),
        (
            "Average GPA by department",
            """
            SELECT major AS department, ROUND(AVG(gpa), 2) AS avg_gpa
            FROM students
            GROUP BY major
            ORDER BY avg_gpa DESC
            """,
        ),
    ],
    "courses": [
        (
            "Courses by department",
            """
            SELECT department, COUNT(*) AS course_count
            FROM courses
            GROUP BY department
            ORDER BY course_count DESC
            """,
        ),
        (
            "Highest enrollment courses",
            """
            SELECT c.course_name, COUNT(*) AS enrollment_count
            FROM enrollments e
            JOIN courses c ON c.course_id = e.course_id
            GROUP BY c.course_id, c.course_name
            ORDER BY enrollment_count DESC
            LIMIT 10
            """,
        ),
    ],
    "enrollments": [
        (
            "Enrollments per semester",
            """
            SELECT semester, COUNT(*) AS enrollment_count
            FROM enrollments
            GROUP BY semester
            ORDER BY semester
            """,
        ),
        (
            "Average grade by course",
            """
            SELECT c.course_name, ROUND(AVG(e.grade), 2) AS avg_grade
            FROM enrollments e
            JOIN courses c ON c.course_id = e.course_id
            GROUP BY c.course_id, c.course_name
            ORDER BY avg_grade DESC
            """,
        ),
    ],
    "properties": [
        (
            "Properties by type",
            """
            SELECT property_type, COUNT(*) AS property_count
            FROM properties
            GROUP BY property_type
            ORDER BY property_count DESC
            """,
        ),
        (
            "Average listing price by city",
            """
            SELECT city, ROUND(AVG(listing_price), 2) AS avg_listing_price
            FROM properties
            GROUP BY city
            ORDER BY avg_listing_price DESC
            """,
        ),
    ],
    "agents": [
        (
            "Agent count by office",
            """
            SELECT brokerage, COUNT(*) AS agent_count
            FROM agents
            GROUP BY brokerage
            ORDER BY agent_count DESC
            """,
        ),
        (
            "Top performing agents by sales",
            """
            SELECT a.first_name || ' ' || a.last_name AS agent_name, ROUND(SUM(t.sale_price), 2) AS total_sales
            FROM transactions t
            JOIN agents a ON a.agent_id = t.agent_id
            GROUP BY a.agent_id, agent_name
            ORDER BY total_sales DESC
            LIMIT 10
            """,
        ),
    ],
    "transactions": [
        (
            "Total transaction volume by month",
            """
            SELECT SUBSTR(sale_date, 1, 7) AS sale_month, ROUND(SUM(sale_price), 2) AS total_volume
            FROM transactions
            GROUP BY sale_month
            ORDER BY sale_month
            """,
        ),
        (
            "Sales vs rentals",
            """
            SELECT p.status, COUNT(*) AS transaction_count
            FROM transactions t
            JOIN properties p ON p.property_id = t.property_id
            GROUP BY p.status
            ORDER BY transaction_count DESC
            """,
        ),
    ],
    "menu_items": [
        (
            "Menu items by category",
            """
            SELECT category, COUNT(*) AS item_count
            FROM menu_items
            GROUP BY category
            ORDER BY item_count DESC
            """,
        ),
        (
            "Average price per category",
            """
            SELECT category, ROUND(AVG(price), 2) AS avg_price
            FROM menu_items
            GROUP BY category
            ORDER BY avg_price DESC
            """,
        ),
    ],
    "order_details": [
        (
            "Most ordered items",
            """
            SELECT m.name, SUM(od.quantity) AS total_quantity
            FROM order_details od
            JOIN menu_items m ON m.item_id = od.item_id
            GROUP BY m.item_id, m.name
            ORDER BY total_quantity DESC
            LIMIT 10
            """,
        ),
        (
            "Average quantity per order",
            """
            SELECT order_id, ROUND(AVG(quantity), 2) AS avg_quantity
            FROM order_details
            GROUP BY order_id
            ORDER BY avg_quantity DESC
            LIMIT 20
            """,
        ),
    ],
}


TABLE_SOURCES = {
    "customers": DATASETS_DIR / "ecommerce" / "customers.csv",
    "products": DATASETS_DIR / "ecommerce" / "products.csv",
    "orders": DATASETS_DIR / "ecommerce" / "orders.csv",
    "ecommerce_orders": DATASETS_DIR / "ecommerce" / "orders.csv",
    "order_items": DATASETS_DIR / "ecommerce" / "order_items.csv",
    "teams": DATASETS_DIR / "sports" / "teams.csv",
    "players": DATASETS_DIR / "sports" / "players.csv",
    "games": DATASETS_DIR / "sports" / "games.csv",
    "player_stats": DATASETS_DIR / "sports" / "player_stats.csv",
    "doctors": DATASETS_DIR / "medical" / "doctors.csv",
    "patients": DATASETS_DIR / "medical" / "patients.csv",
    "visits": DATASETS_DIR / "medical" / "visits.csv",
    "prescriptions": DATASETS_DIR / "medical" / "prescriptions.csv",
    "sales_reps": DATASETS_DIR / "sales" / "sales_reps.csv",
    "catalog": DATASETS_DIR / "sales" / "catalog.csv",
    "deals": DATASETS_DIR / "sales" / "deals.csv",
    "activities": DATASETS_DIR / "sales" / "activities.csv",
    "assets": DATASETS_DIR / "cybersecurity" / "assets.csv",
    "vulnerabilities": DATASETS_DIR / "cybersecurity" / "vulnerabilities.csv",
    "security_events": DATASETS_DIR / "cybersecurity" / "security_events.csv",
    "scan_results": DATASETS_DIR / "cybersecurity" / "scan_results.csv",
    "employees": DATASETS_DIR / "hr" / "employees.csv",
    "performance_reviews": DATASETS_DIR / "hr" / "performance_reviews.csv",
    "salary_history": DATASETS_DIR / "hr" / "salary_history.csv",
    "restaurant_orders": DATASETS_DIR / "restaurant" / "orders.csv",
    "students": DATASETS_DIR / "education" / "students.csv",
    "courses": DATASETS_DIR / "education" / "courses.csv",
    "enrollments": DATASETS_DIR / "education" / "enrollments.csv",
    "properties": DATASETS_DIR / "real_estate" / "properties.csv",
    "agents": DATASETS_DIR / "real_estate" / "agents.csv",
    "transactions": DATASETS_DIR / "real_estate" / "transactions.csv",
    "menu_items": DATASETS_DIR / "restaurant" / "menu_items.csv",
    "order_details": DATASETS_DIR / "restaurant" / "order_details.csv",
}


def create_table_from_csv(conn: sqlite3.Connection, table_name: str, path: Path) -> None:
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        columns = reader.fieldnames or []
        quoted_columns = ", ".join(f'"{column}" TEXT' for column in columns)
        conn.execute(f'DROP TABLE IF EXISTS "{table_name}"')
        conn.execute(f'CREATE TABLE "{table_name}" ({quoted_columns})')
        placeholders = ", ".join("?" for _ in columns)
        insert_sql = f'INSERT INTO "{table_name}" VALUES ({placeholders})'
        rows = [tuple(row[column] for column in columns) for row in reader]
        conn.executemany(insert_sql, rows)


def build_database() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    for table_name, source in TABLE_SOURCES.items():
        create_table_from_csv(conn, table_name, source)
    return conn


def run_checks() -> list[dict[str, object]]:
    conn = build_database()
    results: list[dict[str, object]] = []

    for table_name, checks in SUGGESTION_SQL.items():
        for prompt, sql in checks:
            rows = conn.execute(sql).fetchall()
            results.append(
                {
                    "table": table_name,
                    "prompt": prompt,
                    "row_count": len(rows),
                    "status": "ok" if rows else "empty",
                }
            )

    return results


def main() -> int:
    results = run_checks()
    empty = [result for result in results if result["status"] == "empty"]

    print("Suggestion verification summary")
    print(f"Total checks: {len(results)}")
    print(f"Empty checks: {len(empty)}")
    print()

    for result in results:
        print(
            f"[{result['status'].upper():5}] {result['table']}: {result['prompt']} "
            f"(rows={result['row_count']})"
        )

    if empty:
        print()
        print("Suggestions to remove:")
        for result in empty:
            print(f"- {result['table']}: {result['prompt']}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())