#!/usr/bin/env python3
"""Generate realistic multi-table datasets for ChatDB across 5 domains."""

import csv
import os
import random
from datetime import datetime, timedelta

random.seed(42)
BASE = os.path.join(os.path.dirname(__file__), "..", "datasets")


def write_csv(domain: str, name: str, headers: list[str], rows: list[list]):
    path = os.path.join(BASE, domain)
    os.makedirs(path, exist_ok=True)
    filepath = os.path.join(path, f"{name}.csv")
    with open(filepath, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(headers)
        w.writerows(rows)
    print(f"  {filepath}: {len(rows)} rows")


def rand_date(start: str, end: str) -> str:
    s = datetime.strptime(start, "%Y-%m-%d")
    e = datetime.strptime(end, "%Y-%m-%d")
    delta = (e - s).days
    return (s + timedelta(days=random.randint(0, delta))).strftime("%Y-%m-%d")


def rand_datetime(start: str, end: str) -> str:
    s = datetime.strptime(start, "%Y-%m-%d")
    e = datetime.strptime(end, "%Y-%m-%d")
    delta = int((e - s).total_seconds())
    return (s + timedelta(seconds=random.randint(0, delta))).strftime("%Y-%m-%d %H:%M:%S")


# ─── E-COMMERCE ─────────────────────────────────────────────

def generate_ecommerce():
    print("E-Commerce:")

    # Customers
    first_names = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda",
                   "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
                   "Thomas", "Sarah", "Christopher", "Karen", "Daniel", "Lisa", "Matthew", "Nancy",
                   "Anthony", "Betty", "Mark", "Margaret", "Donald", "Sandra", "Steven", "Ashley",
                   "Paul", "Dorothy", "Andrew", "Kimberly", "Joshua", "Emily", "Kenneth", "Donna"]
    last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
                  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
                  "Thomas", "Taylor", "Moore", "Jackson", "Martin"]
    cities = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia",
              "San Antonio", "San Diego", "Dallas", "San Jose", "Austin", "Jacksonville",
              "Fort Worth", "Columbus", "Charlotte", "Indianapolis", "Seattle", "Denver", "Boston", "Portland"]
    states = {"New York": "NY", "Los Angeles": "CA", "Chicago": "IL", "Houston": "TX",
              "Phoenix": "AZ", "Philadelphia": "PA", "San Antonio": "TX", "San Diego": "CA",
              "Dallas": "TX", "San Jose": "CA", "Austin": "TX", "Jacksonville": "FL",
              "Fort Worth": "TX", "Columbus": "OH", "Charlotte": "NC", "Indianapolis": "IN",
              "Seattle": "WA", "Denver": "CO", "Boston": "MA", "Portland": "OR"}
    tiers = ["Bronze", "Silver", "Gold", "Platinum"]

    customers = []
    for i in range(1, 501):
        city = random.choice(cities)
        customers.append([
            i,
            random.choice(first_names),
            random.choice(last_names),
            f"{random.choice(first_names).lower()}{i}@email.com",
            city,
            states[city],
            random.choices(tiers, weights=[40, 30, 20, 10])[0],
            rand_date("2019-01-01", "2024-12-31"),
        ])
    write_csv("ecommerce", "customers", [
        "customer_id", "first_name", "last_name", "email", "city", "state",
        "membership_tier", "signup_date"
    ], customers)

    # Products
    categories = {
        "Electronics": ["Wireless Headphones", "Bluetooth Speaker", "USB-C Hub", "Webcam", "Mechanical Keyboard",
                        "Gaming Mouse", "Monitor Stand", "Laptop Stand", "Power Bank", "Smart Watch",
                        "Tablet", "E-Reader", "Streaming Stick", "WiFi Router", "External SSD"],
        "Clothing": ["Cotton T-Shirt", "Denim Jeans", "Hoodie", "Running Shoes", "Winter Jacket",
                     "Polo Shirt", "Chino Pants", "Sneakers", "Baseball Cap", "Wool Sweater",
                     "Dress Shirt", "Cargo Shorts", "Rain Jacket", "Leather Belt", "Silk Scarf"],
        "Home & Kitchen": ["Coffee Maker", "Blender", "Air Fryer", "Toaster", "Knife Set",
                           "Cutting Board", "Cast Iron Pan", "Mixing Bowl Set", "Food Processor", "Electric Kettle",
                           "Dish Rack", "Spice Rack", "Water Filter", "Vacuum Sealer", "Rice Cooker"],
        "Books": ["Python Programming", "Data Science Handbook", "Machine Learning Basics", "Web Development",
                  "Cloud Architecture", "Algorithm Design", "System Design", "Clean Code", "Design Patterns",
                  "Database Internals", "Distributed Systems", "Security Engineering", "DevOps Handbook",
                  "Statistics For All", "AI Ethics"],
        "Sports": ["Yoga Mat", "Resistance Bands", "Jump Rope", "Foam Roller", "Water Bottle",
                   "Running Belt", "Gym Bag", "Wrist Wraps", "Pull-Up Bar", "Ab Roller",
                   "Dumbbell Set", "Kettlebell", "Exercise Ball", "Ankle Weights", "Boxing Gloves"],
    }
    products = []
    pid = 1
    for cat, items in categories.items():
        for item in items:
            products.append([
                pid, item, cat,
                round(random.uniform(9.99, 299.99), 2),
                round(random.uniform(2.0, 100.0), 2),
                random.randint(0, 500),
                round(random.uniform(1.0, 5.0), 1),
                random.randint(5, 5000),
            ])
            pid += 1
    write_csv("ecommerce", "products", [
        "product_id", "product_name", "category", "price", "cost",
        "stock_quantity", "avg_rating", "review_count"
    ], products)

    # Orders (1500 orders)
    statuses = ["delivered", "shipped", "processing", "cancelled", "returned"]
    payment_methods = ["credit_card", "debit_card", "paypal", "apple_pay", "google_pay"]
    orders = []
    order_items = []
    oi_id = 1
    for oid in range(1, 1501):
        cust = random.choice(customers)
        status = random.choices(statuses, weights=[60, 15, 10, 10, 5])[0]
        order_date = rand_date("2023-01-01", "2025-03-31")
        n_items = random.randint(1, 5)
        chosen_products = random.sample(products, n_items)
        total = 0.0
        for prod in chosen_products:
            qty = random.randint(1, 3)
            line_total = round(prod[3] * qty, 2)
            discount = round(random.choice([0, 0, 0, 5, 10, 15, 20]) / 100 * line_total, 2)
            final = round(line_total - discount, 2)
            total += final
            order_items.append([oi_id, oid, prod[0], qty, prod[3], discount, final])
            oi_id += 1
        orders.append([
            oid, cust[0], order_date, round(total, 2), status,
            random.choice(payment_methods),
            random.choice(["standard", "express", "overnight"]),
        ])
    write_csv("ecommerce", "orders", [
        "order_id", "customer_id", "order_date", "total_amount", "status",
        "payment_method", "shipping_method"
    ], orders)
    write_csv("ecommerce", "order_items", [
        "item_id", "order_id", "product_id", "quantity", "unit_price", "discount", "line_total"
    ], order_items)


# ─── SPORTS ─────────────────────────────────────────────────

def generate_sports():
    print("Sports:")

    teams = [
        ("Lakers", "Los Angeles", "Western"), ("Celtics", "Boston", "Eastern"),
        ("Warriors", "San Francisco", "Western"), ("Bulls", "Chicago", "Eastern"),
        ("Heat", "Miami", "Eastern"), ("Nets", "Brooklyn", "Eastern"),
        ("Suns", "Phoenix", "Western"), ("Mavericks", "Dallas", "Western"),
        ("Nuggets", "Denver", "Western"), ("76ers", "Philadelphia", "Eastern"),
        ("Bucks", "Milwaukee", "Eastern"), ("Clippers", "Los Angeles", "Western"),
        ("Hawks", "Atlanta", "Eastern"), ("Jazz", "Salt Lake City", "Western"),
        ("Raptors", "Toronto", "Eastern"), ("Spurs", "San Antonio", "Western"),
        ("Pacers", "Indianapolis", "Eastern"), ("Kings", "Sacramento", "Western"),
        ("Pelicans", "New Orleans", "Western"), ("Trail Blazers", "Portland", "Western"),
    ]
    team_rows = []
    for i, (name, city, conf) in enumerate(teams, 1):
        team_rows.append([i, name, city, conf, random.randint(1940, 2010)])
    write_csv("sports", "teams", ["team_id", "team_name", "city", "conference", "founded_year"], team_rows)

    # Players (400)
    positions = ["PG", "SG", "SF", "PF", "C"]
    first_names = ["LeBron", "Stephen", "Kevin", "Giannis", "Luka", "Jayson", "Nikola",
                   "Joel", "Anthony", "Damian", "Devin", "Ja", "Trae", "Zion", "Shai",
                   "Donovan", "Bam", "Darius", "Tyrese", "Cade", "Paolo", "Victor",
                   "Jalen", "Scottie", "Evan", "Austin", "Desmond", "Marcus", "Tyler", "Brandon"]
    last_names = ["James", "Curry", "Durant", "Antetokounmpo", "Doncic", "Tatum", "Jokic",
                  "Embiid", "Davis", "Lillard", "Booker", "Morant", "Young", "Williamson",
                  "Alexander", "Mitchell", "Adebayo", "Garland", "Haliburton", "Cunningham",
                  "Banchero", "Wembanyama", "Brunson", "Barnes", "Mobley", "Reaves", "Bane",
                  "Smart", "Herro", "Ingram"]
    players = []
    for i in range(1, 401):
        players.append([
            i,
            random.choice(first_names),
            random.choice(last_names),
            random.choice([t[0] for t in team_rows]),
            random.choice(positions),
            random.randint(19, 38),
            round(random.uniform(6.0, 7.2), 1),
            round(random.uniform(170, 270), 0),
            random.randint(0, 20),
            round(random.uniform(1_000_000, 50_000_000), 0),
        ])
    write_csv("sports", "players", [
        "player_id", "first_name", "last_name", "team_id", "position",
        "age", "height_ft", "weight_lbs", "years_experience", "salary"
    ], players)

    # Games (1200 — a season+)
    games = []
    for gid in range(1, 1201):
        home, away = random.sample(range(1, 21), 2)
        home_score = random.randint(85, 140)
        away_score = random.randint(85, 140)
        while home_score == away_score:
            away_score = random.randint(85, 140)
        games.append([
            gid, home, away,
            rand_date("2023-10-01", "2025-04-15"),
            home_score, away_score,
            random.randint(12000, 22000),
            random.choice(["regular", "playoff"]),
        ])
    write_csv("sports", "games", [
        "game_id", "home_team_id", "away_team_id", "game_date",
        "home_score", "away_score", "attendance", "season_type"
    ], games)

    # Player game stats (sample — 1 stat line per game per 2-5 random players)
    player_stats = []
    sid = 1
    for game in games:
        gid = game[0]
        home_players = [p for p in players if p[3] == game[1]]
        away_players = [p for p in players if p[3] == game[2]]
        for p in random.sample(home_players, min(5, len(home_players))):
            mins = random.randint(15, 40)
            player_stats.append([
                sid, gid, p[0], mins,
                random.randint(2, 35),  # points
                random.randint(0, 15),  # rebounds
                random.randint(0, 12),  # assists
                random.randint(0, 5),   # steals
                random.randint(0, 4),   # blocks
                random.randint(0, 6),   # turnovers
            ])
            sid += 1
        for p in random.sample(away_players, min(5, len(away_players))):
            mins = random.randint(15, 40)
            player_stats.append([
                sid, gid, p[0], mins,
                random.randint(2, 35),
                random.randint(0, 15),
                random.randint(0, 12),
                random.randint(0, 5),
                random.randint(0, 4),
                random.randint(0, 6),
            ])
            sid += 1
    write_csv("sports", "player_stats", [
        "stat_id", "game_id", "player_id", "minutes_played",
        "points", "rebounds", "assists", "steals", "blocks", "turnovers"
    ], player_stats)


# ─── MEDICAL ────────────────────────────────────────────────

def generate_medical():
    print("Medical:")

    departments = ["Emergency", "Cardiology", "Neurology", "Orthopedics", "Oncology",
                   "Pediatrics", "Radiology", "Surgery", "Internal Medicine", "Psychiatry"]

    # Doctors (80)
    specializations = ["General Medicine", "Cardiology", "Neurology", "Orthopedics", "Oncology",
                       "Pediatrics", "Radiology", "General Surgery", "Internal Medicine", "Psychiatry",
                       "Dermatology", "Gastroenterology"]
    first_names = ["Sarah", "James", "Emily", "Michael", "Rachel", "David", "Anna", "Robert",
                   "Maria", "William", "Jennifer", "Andrew", "Lisa", "Daniel", "Karen",
                   "Christopher", "Amanda", "Joseph", "Michelle", "Thomas"]
    last_names = ["Chen", "Patel", "Kim", "Wilson", "Martinez", "Brown", "Lee", "Garcia",
                  "Thompson", "White", "Harris", "Clark", "Lewis", "Robinson", "Walker",
                  "Young", "Allen", "King", "Wright", "Scott"]
    doctors = []
    for i in range(1, 81):
        doctors.append([
            i,
            f"Dr. {random.choice(first_names)} {random.choice(last_names)}",
            random.choice(specializations),
            random.choice(departments),
            random.randint(2, 35),
            random.choice(["MD", "DO"]),
        ])
    write_csv("medical", "doctors", [
        "doctor_id", "doctor_name", "specialization", "department",
        "years_experience", "degree"
    ], doctors)

    # Patients (1000)
    conditions = ["Hypertension", "Type 2 Diabetes", "Asthma", "Migraine", "Arthritis",
                  "Depression", "Anxiety", "GERD", "Hypothyroidism", "Chronic Back Pain",
                  "Anemia", "COPD", "Heart Failure", "Atrial Fibrillation", "Pneumonia",
                  "Kidney Stones", "Fracture", "Concussion", "Appendicitis", "Cellulitis"]
    blood_types = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
    pnames_f = ["Alice", "Beth", "Carol", "Diana", "Eve", "Fiona", "Grace", "Hannah",
                "Iris", "Julia", "Kate", "Laura", "Megan", "Nina", "Olivia", "Paula",
                "Quinn", "Rita", "Sophia", "Tara", "Uma", "Vera", "Wendy", "Xena", "Yara"]
    pnames_m = ["Adam", "Brian", "Carl", "Derek", "Eric", "Frank", "George", "Henry",
                "Ian", "Jack", "Kyle", "Leon", "Max", "Noah", "Oscar", "Peter",
                "Quinn", "Ray", "Sam", "Tim", "Uri", "Vince", "Walter", "Xavier", "Zach"]
    patients_data = []
    for i in range(1, 1001):
        gender = random.choice(["Male", "Female"])
        fname = random.choice(pnames_m if gender == "Male" else pnames_f)
        lname = random.choice(last_names)
        patients_data.append([
            i, f"{fname} {lname}", random.randint(1, 95), gender,
            random.choice(blood_types),
            random.choice(conditions),
            random.choice(["Active", "Discharged", "Transferred"]),
            random.choice(["Private Insurance", "Medicare", "Medicaid", "Self-Pay", "Uninsured"]),
        ])
    write_csv("medical", "patients", [
        "patient_id", "patient_name", "age", "gender", "blood_type",
        "primary_diagnosis", "status", "insurance_type"
    ], patients_data)

    # Visits (2000)
    visit_types = ["Emergency", "Outpatient", "Inpatient", "Follow-up", "Surgery"]
    visits = []
    for vid in range(1, 2001):
        patient = random.choice(patients_data)
        doctor = random.choice(doctors)
        admit = rand_date("2023-01-01", "2025-03-31")
        los = random.choices([0, 1, 2, 3, 5, 7, 14, 30], weights=[30, 25, 15, 10, 8, 5, 5, 2])[0]
        discharge = (datetime.strptime(admit, "%Y-%m-%d") + timedelta(days=los)).strftime("%Y-%m-%d") if los > 0 else admit
        visits.append([
            vid, patient[0], doctor[0],
            admit, discharge, los,
            random.choice(visit_types),
            random.choice(departments),
            random.choice(["Improved", "Stable", "Referred", "Critical", "Recovered"]),
            round(random.uniform(150.0, 50000.0), 2),
        ])
    write_csv("medical", "visits", [
        "visit_id", "patient_id", "doctor_id",
        "admission_date", "discharge_date", "length_of_stay_days",
        "visit_type", "department", "outcome", "total_cost"
    ], visits)

    # Prescriptions (3000)
    medications = ["Lisinopril", "Metformin", "Atorvastatin", "Amlodipine", "Omeprazole",
                   "Metoprolol", "Albuterol", "Losartan", "Gabapentin", "Sertraline",
                   "Hydrochlorothiazide", "Acetaminophen", "Ibuprofen", "Amoxicillin", "Prednisone",
                   "Furosemide", "Warfarin", "Insulin", "Levothyroxine", "Clopidogrel"]
    prescriptions = []
    for rx_id in range(1, 3001):
        visit = random.choice(visits)
        prescriptions.append([
            rx_id, visit[0], visit[1], visit[2],
            random.choice(medications),
            random.choice(["5mg", "10mg", "20mg", "25mg", "50mg", "100mg", "250mg", "500mg"]),
            random.choice(["Once daily", "Twice daily", "Three times daily", "As needed"]),
            random.randint(7, 90),
            rand_date(visit[3], "2025-06-30"),
        ])
    write_csv("medical", "prescriptions", [
        "prescription_id", "visit_id", "patient_id", "doctor_id",
        "medication", "dosage", "frequency", "duration_days", "prescribed_date"
    ], prescriptions)


# ─── SALES ──────────────────────────────────────────────────

def generate_sales():
    print("Sales:")

    regions = ["North America", "Europe", "Asia Pacific", "Latin America", "Middle East"]
    countries = {
        "North America": ["USA", "Canada", "Mexico"],
        "Europe": ["UK", "Germany", "France", "Spain", "Italy"],
        "Asia Pacific": ["Japan", "Australia", "India", "South Korea", "Singapore"],
        "Latin America": ["Brazil", "Argentina", "Chile", "Colombia"],
        "Middle East": ["UAE", "Saudi Arabia", "Israel", "Qatar"],
    }

    # Sales reps (100)
    first_names = ["Alex", "Jordan", "Morgan", "Taylor", "Casey", "Riley", "Quinn", "Avery",
                   "Cameron", "Dakota", "Reese", "Jamie", "Skyler", "Drew", "Peyton",
                   "Charlie", "Frankie", "Blair", "Emerson", "Lennon"]
    last_names = ["Anderson", "Brooks", "Carter", "Davis", "Evans", "Foster", "Grant",
                  "Hayes", "Irving", "Jensen", "Knight", "Lambert", "Monroe", "Nelson",
                  "Owens", "Parker", "Quinn", "Reed", "Stone", "Tucker"]
    reps = []
    for i in range(1, 101):
        region = random.choice(regions)
        reps.append([
            i,
            f"{random.choice(first_names)} {random.choice(last_names)}",
            region,
            random.choice(countries[region]),
            random.choice(["Junior", "Mid", "Senior", "Lead", "Director"]),
            rand_date("2015-01-01", "2024-01-01"),
            round(random.uniform(40000, 150000), 2),
        ])
    write_csv("sales", "sales_reps", [
        "rep_id", "rep_name", "region", "country", "level", "hire_date", "base_salary"
    ], reps)

    # Products (50)
    prod_categories = ["SaaS", "Hardware", "Consulting", "Support", "Training"]
    prod_names = {
        "SaaS": ["CloudSync Pro", "DataFlow", "SecureVault", "AnalyticsHub", "DevOps Suite",
                  "CRM Enterprise", "HRCloud", "FinanceAI", "MarketPulse", "ProjectTrack"],
        "Hardware": ["ServerX 3000", "NetworkSwitch Pro", "StorageArray 500", "WorkStation Elite",
                     "RackMount Unit", "UPS Backup 2000", "NAS Drive 10TB", "Firewall Appliance",
                     "Load Balancer LB-8", "Router Enterprise"],
        "Consulting": ["Strategy Workshop", "Migration Service", "Security Audit", "Performance Review",
                       "Architecture Design", "Compliance Assessment", "Data Strategy", "Cloud Readiness",
                       "Digital Transformation", "AI Readiness"],
        "Support": ["Premium Support 24/7", "Standard Support", "Extended Warranty", "Managed Service",
                    "Incident Response", "Monitoring Service", "Backup Service", "Disaster Recovery",
                    "SLA Upgrade", "Dedicated Engineer"],
        "Training": ["Admin Bootcamp", "Developer Workshop", "Security Certification", "Cloud Fundamentals",
                     "Advanced Analytics", "Data Engineering", "ML Practitioner", "DevOps Essentials",
                     "Leadership Program", "Sales Enablement"],
    }
    products = []
    pid = 1
    for cat, names in prod_names.items():
        for name in names:
            products.append([pid, name, cat, round(random.uniform(500, 100000), 2)])
            pid += 1
    write_csv("sales", "catalog", [
        "product_id", "product_name", "category", "list_price"
    ], products)

    # Deals/Opportunities (1500)
    stages = ["Prospecting", "Qualification", "Proposal", "Negotiation", "Closed Won", "Closed Lost"]
    deal_sources = ["Inbound", "Outbound", "Referral", "Partner", "Event", "Cold Call"]
    deals = []
    for did in range(1, 1501):
        rep = random.choice(reps)
        prod = random.choice(products)
        stage = random.choices(stages, weights=[10, 15, 20, 15, 30, 10])[0]
        amount = round(prod[3] * random.uniform(0.7, 3.0) * random.randint(1, 10), 2)
        deals.append([
            did, rep[0], prod[0],
            round(amount, 2),
            stage,
            random.choice(deal_sources),
            rand_date("2023-01-01", "2025-03-31"),
            rand_date("2023-02-01", "2025-06-30") if stage.startswith("Closed") else "",
            random.randint(10, 100) if stage != "Closed Lost" else 0,
        ])
    write_csv("sales", "deals", [
        "deal_id", "rep_id", "product_id", "deal_amount", "stage",
        "source", "created_date", "closed_date", "win_probability"
    ], deals)

    # Activities (2000)
    activity_types = ["Call", "Email", "Meeting", "Demo", "Follow-up", "Proposal Sent"]
    activities = []
    for aid in range(1, 2001):
        deal = random.choice(deals)
        activities.append([
            aid, deal[0], deal[1],
            random.choice(activity_types),
            rand_datetime("2023-01-01", "2025-04-01"),
            random.randint(5, 120),
            random.choice(["Positive", "Neutral", "Negative"]),
        ])
    write_csv("sales", "activities", [
        "activity_id", "deal_id", "rep_id", "activity_type",
        "activity_date", "duration_minutes", "outcome"
    ], activities)


# ─── CYBERSECURITY ──────────────────────────────────────────

def generate_cybersecurity():
    print("Cybersecurity:")

    # Assets (200)
    asset_types = ["Server", "Workstation", "Firewall", "Router", "Switch", "IoT Device",
                   "Database Server", "Web Server", "API Gateway", "Load Balancer"]
    os_list = ["Ubuntu 22.04", "Windows Server 2022", "CentOS 8", "RHEL 9", "Windows 11",
               "macOS Sonoma", "Debian 12", "FreeBSD 14", "Alpine Linux", "Amazon Linux 2"]
    criticality = ["Critical", "High", "Medium", "Low"]
    assets = []
    for i in range(1, 201):
        assets.append([
            i,
            f"asset-{i:04d}",
            random.choice(asset_types),
            f"10.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}",
            random.choice(os_list),
            random.choice(criticality),
            random.choice(["Production", "Staging", "Development", "DMZ"]),
            random.choice(["Online", "Offline", "Maintenance"]),
        ])
    write_csv("cybersecurity", "assets", [
        "asset_id", "hostname", "asset_type", "ip_address",
        "os", "criticality", "environment", "status"
    ], assets)

    # Vulnerabilities (300)
    vuln_types = ["SQL Injection", "XSS", "CSRF", "Buffer Overflow", "Path Traversal",
                  "Remote Code Execution", "Privilege Escalation", "DoS", "Information Disclosure",
                  "Authentication Bypass", "Insecure Deserialization", "SSRF",
                  "Broken Access Control", "Cryptographic Failure", "Security Misconfiguration"]
    severities = ["Critical", "High", "Medium", "Low", "Informational"]
    vulns = []
    for i in range(1, 301):
        vulns.append([
            i,
            f"CVE-{random.randint(2020,2025)}-{random.randint(1000,99999)}",
            random.choice(vuln_types),
            random.choices(severities, weights=[10, 25, 35, 20, 10])[0],
            round(random.uniform(0.0, 10.0), 1),  # CVSS score
            random.choice(["Yes", "No"]),  # exploit available
        ])
    write_csv("cybersecurity", "vulnerabilities", [
        "vuln_id", "cve_id", "vuln_type", "severity", "cvss_score", "exploit_available"
    ], vulns)

    # Security Events / Alerts (2000)
    event_types = ["Intrusion Attempt", "Malware Detected", "Failed Login", "Port Scan",
                   "Data Exfiltration", "Brute Force", "Phishing", "Lateral Movement",
                   "Privilege Escalation", "Policy Violation", "Anomalous Traffic", "DDoS"]
    alert_statuses = ["Open", "Investigating", "Resolved", "False Positive", "Escalated"]
    events = []
    for eid in range(1, 2001):
        asset = random.choice(assets)
        events.append([
            eid,
            asset[0],
            random.choice(event_types),
            random.choices(severities[:4], weights=[10, 25, 40, 25])[0],
            rand_datetime("2023-01-01", "2025-04-01"),
            f"{random.randint(1,254)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}",
            random.choice(alert_statuses),
            random.choice(["IDS", "SIEM", "EDR", "Firewall", "WAF", "Manual"]),
        ])
    write_csv("cybersecurity", "security_events", [
        "event_id", "asset_id", "event_type", "severity",
        "event_timestamp", "source_ip", "status", "detection_source"
    ], events)

    # Scan Results (1500 — vulnerability scans on assets)
    scan_results = []
    for sid in range(1, 1501):
        asset = random.choice(assets)
        vuln = random.choice(vulns)
        scan_results.append([
            sid, asset[0], vuln[0],
            rand_date("2023-01-01", "2025-04-01"),
            random.choice(["Open", "Remediated", "Accepted Risk", "In Progress"]),
            random.choice(["Patch", "Config Change", "Workaround", "Upgrade", "N/A"]),
        ])
    write_csv("cybersecurity", "scan_results", [
        "scan_id", "asset_id", "vuln_id", "scan_date",
        "finding_status", "remediation_action"
    ], scan_results)


# ─── HR (ENHANCED) ──────────────────────────────────────────

def generate_hr():
    print("HR (enhanced):")

    departments = ["Engineering", "Sales", "Marketing", "Finance", "HR",
                   "Operations", "Legal", "Product", "Design", "Data Science"]
    locations = ["New York", "San Francisco", "Chicago", "Austin", "Seattle",
                 "Boston", "Denver", "Miami", "Portland", "Atlanta"]

    first_names = ["Alice", "Bob", "Carol", "Derek", "Eve", "Frank", "Grace", "Henry",
                   "Iris", "Jack", "Kate", "Leon", "Megan", "Noah", "Olivia", "Peter",
                   "Quinn", "Rachel", "Sam", "Tina", "Uma", "Victor", "Wendy", "Xavier",
                   "Yara", "Zach", "Anna", "Ben", "Clara", "Dan"]
    last_names = ["Johnson", "Smith", "Williams", "Brown", "Jones", "Garcia", "Miller",
                  "Davis", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson",
                  "Martin", "Lee", "Walker", "Hall", "Allen", "Young"]

    # Employees (500)
    employees = []
    for i in range(1, 501):
        dept = random.choice(departments)
        employees.append([
            i,
            random.choice(first_names),
            random.choice(last_names),
            dept,
            f"{'Senior ' if random.random() > 0.6 else ''}{dept} {'Manager' if random.random() > 0.7 else 'Analyst' if random.random() > 0.5 else 'Specialist'}",
            rand_date("2015-01-01", "2024-12-31"),
            round(random.uniform(45000, 200000), 2),
            random.choice(["Active", "On Leave", "Terminated"]),
            random.choice(locations),
            random.choice(["Full-Time", "Part-Time", "Contract"]),
            random.randint(0, 30) if random.random() > 0.3 else "",
        ])
    write_csv("hr", "employees", [
        "employee_id", "first_name", "last_name", "department", "job_title",
        "hire_date", "salary", "status", "location", "employment_type", "manager_id"
    ], employees)

    # Performance reviews (1000)
    reviews = []
    for rid in range(1, 1001):
        emp = random.choice(employees)
        reviews.append([
            rid, emp[0],
            random.choice(["2023-Q1", "2023-Q2", "2023-Q3", "2023-Q4",
                           "2024-Q1", "2024-Q2", "2024-Q3", "2024-Q4", "2025-Q1"]),
            round(random.uniform(1.0, 5.0), 1),
            random.choice(["Exceeds Expectations", "Meets Expectations", "Below Expectations", "Outstanding"]),
            random.choice(["Promoted", "Bonus", "PIP", "No Action", "Raise"]),
        ])
    write_csv("hr", "performance_reviews", [
        "review_id", "employee_id", "review_period", "rating", "assessment", "action_taken"
    ], reviews)

    # Salary history (1500)
    salary_hist = []
    for shid in range(1, 1501):
        emp = random.choice(employees)
        salary_hist.append([
            shid, emp[0],
            rand_date("2015-01-01", "2025-03-31"),
            round(random.uniform(40000, 190000), 2),
            round(random.uniform(45000, 210000), 2),
            random.choice(["Annual Review", "Promotion", "Market Adjustment", "Hire", "Demotion"]),
        ])
    write_csv("hr", "salary_history", [
        "history_id", "employee_id", "effective_date",
        "old_salary", "new_salary", "change_reason"
    ], salary_hist)


if __name__ == "__main__":
    # Remove old single-table datasets
    import shutil
    for old_dir in ["hr", "medical", "sales"]:
        old_path = os.path.join(BASE, old_dir)
        if os.path.exists(old_path):
            shutil.rmtree(old_path)
            print(f"Removed old {old_dir}/")

    generate_ecommerce()
    generate_sports()
    generate_medical()
    generate_sales()
    generate_cybersecurity()
    generate_hr()
    print("\nDone! All datasets generated.")
