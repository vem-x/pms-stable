"""Seed script to populate the database with 20 goals of different types and scopes."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import Goal, GoalScope, GoalType, GoalStatus, Quarter, User, Organization, OrganizationLevel
from sqlalchemy import text as sa_text
import uuid
from datetime import date

db = SessionLocal()

try:
    # ─── Clear existing goals ───
    print("Clearing existing goals...")
    db.execute(sa_text("DELETE FROM goal_progress_reports"))
    db.execute(sa_text("DELETE FROM goal_tag_assignments"))
    db.execute(sa_text("DELETE FROM goals"))
    db.commit()

    # ─── Get existing users and orgs ───
    admin = db.query(User).filter(User.email == "admin@nigcomsat.gov.ng").first()
    if not admin:
        print("ERROR: Run seed_users.py first!")
        sys.exit(1)

    # Get directors
    tech_director = db.query(User).filter(User.email == "t.okafor@nigcomsat.gov.ng").first()
    mktg_director = db.query(User).filter(User.email == "f.ibrahim@nigcomsat.gov.ng").first()
    ops_director = db.query(User).filter(User.email == "k.eze@nigcomsat.gov.ng").first()

    # Get HODs
    hod_eng = db.query(User).filter(User.email == "s.adeyemi@nigcomsat.gov.ng").first()
    hod_it = db.query(User).filter(User.email == "n.obi@nigcomsat.gov.ng").first()
    hod_sales = db.query(User).filter(User.email == "a.mohammed@nigcomsat.gov.ng").first()
    hod_hr = db.query(User).filter(User.email == "g.nwankwo@nigcomsat.gov.ng").first()
    hod_finance = db.query(User).filter(User.email == "m.aliyu@nigcomsat.gov.ng").first()

    # Get team leads
    frontend_lead = db.query(User).filter(User.email == "c.johnson@nigcomsat.gov.ng").first()
    backend_lead = db.query(User).filter(User.email == "e.williams@nigcomsat.gov.ng").first()

    # Get some staff
    staff1 = db.query(User).filter(User.email == "o.akande@nigcomsat.gov.ng").first()
    staff2 = db.query(User).filter(User.email == "u.nnadi@nigcomsat.gov.ng").first()
    staff3 = db.query(User).filter(User.email == "a.fashola@nigcomsat.gov.ng").first()

    # Get organizations
    global_org = db.query(Organization).filter(Organization.level == OrganizationLevel.GLOBAL).first()
    tech_dir_org = db.query(Organization).filter(Organization.name == "Technical Directorate").first()
    mktg_dir_org = db.query(Organization).filter(Organization.name == "Marketing Directorate").first()
    ops_dir_org = db.query(Organization).filter(Organization.name == "Operations Directorate").first()
    eng_dept = db.query(Organization).filter(Organization.name == "Engineering").first()
    it_dept = db.query(Organization).filter(Organization.name == "IT Infrastructure").first()
    sales_dept = db.query(Organization).filter(Organization.name == "Sales").first()
    hr_dept = db.query(Organization).filter(Organization.name == "Human Resources").first()
    finance_dept = db.query(Organization).filter(Organization.name == "Finance").first()

    print("Creating 20 goals...")

    goals = []

    # ─── COMPANY-WIDE YEARLY GOALS (3) ───
    g1 = Goal(
        id=uuid.uuid4(),
        title="Achieve 30% Revenue Growth in 2026",
        description="<p>Drive the company towards a <strong>30% year-over-year revenue growth</strong> through new satellite service offerings, expanded market reach, and strategic partnerships.</p>",
        kpis="Monthly revenue tracking against target\nNew client acquisition rate\nPartnership deals closed",
        scope=GoalScope.COMPANY_WIDE,
        type=GoalType.YEARLY,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 12, 31),
        progress_percentage=18,
        status=GoalStatus.ACTIVE,
        year=2026,
        created_by=admin.id,
    )
    goals.append(g1)

    g2 = Goal(
        id=uuid.uuid4(),
        title="Improve Customer Satisfaction Score to 90%",
        description="<p>Enhance service delivery and customer support processes to raise the overall <strong>customer satisfaction score from 78% to 90%</strong> by end of year.</p>",
        kpis="Quarterly NPS survey results\nCustomer complaint resolution time\nService uptime percentage",
        scope=GoalScope.COMPANY_WIDE,
        type=GoalType.YEARLY,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 12, 31),
        progress_percentage=25,
        status=GoalStatus.ACTIVE,
        year=2026,
        created_by=admin.id,
    )
    goals.append(g2)

    g3 = Goal(
        id=uuid.uuid4(),
        title="Achieve ISO 27001 Certification",
        description="<p>Complete all requirements for <strong>ISO 27001 Information Security Management</strong> certification to strengthen our security posture and client trust.</p>",
        kpis="Policy documentation completion\nSecurity audit findings resolved\nStaff training completion rate",
        scope=GoalScope.COMPANY_WIDE,
        type=GoalType.YEARLY,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 12, 31),
        progress_percentage=10,
        status=GoalStatus.ACTIVE,
        year=2026,
        created_by=admin.id,
    )
    goals.append(g3)

    # ─── COMPANY-WIDE QUARTERLY GOALS (4) ───
    g4 = Goal(
        id=uuid.uuid4(),
        title="Launch New Customer Portal (Q1)",
        description="<p>Design, develop, and launch the new <strong>customer self-service portal</strong> allowing clients to manage their satellite service subscriptions, view usage analytics, and submit support tickets.</p>",
        kpis="Portal go-live date\nUser registration count\nSupport ticket reduction rate",
        scope=GoalScope.COMPANY_WIDE,
        type=GoalType.QUARTERLY,
        quarter=Quarter.Q1,
        year=2026,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 3, 31),
        progress_percentage=65,
        status=GoalStatus.ACTIVE,
        parent_goal_id=g2.id,
        created_by=admin.id,
    )
    goals.append(g4)

    g5 = Goal(
        id=uuid.uuid4(),
        title="Complete Security Audit Phase 1 (Q1)",
        description="<p>Perform comprehensive <strong>security gap analysis</strong> across all systems and document findings for ISO 27001 readiness assessment.</p>",
        kpis="Systems audited count\nVulnerabilities identified\nRemediation plan created",
        scope=GoalScope.COMPANY_WIDE,
        type=GoalType.QUARTERLY,
        quarter=Quarter.Q1,
        year=2026,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 3, 31),
        progress_percentage=80,
        status=GoalStatus.ACTIVE,
        parent_goal_id=g3.id,
        created_by=admin.id,
    )
    goals.append(g5)

    g6 = Goal(
        id=uuid.uuid4(),
        title="Onboard 15 Enterprise Clients (Q1)",
        description="<p>Expand enterprise client base by onboarding <strong>15 new enterprise-tier clients</strong> through targeted sales campaigns and industry events.</p>",
        kpis="New enterprise contracts signed\nPipeline conversion rate\nAverage deal value",
        scope=GoalScope.COMPANY_WIDE,
        type=GoalType.QUARTERLY,
        quarter=Quarter.Q1,
        year=2026,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 3, 31),
        progress_percentage=40,
        status=GoalStatus.ACTIVE,
        parent_goal_id=g1.id,
        created_by=admin.id,
    )
    goals.append(g6)

    g7 = Goal(
        id=uuid.uuid4(),
        title="Reduce Operational Costs by 10% (Q2)",
        description="<p>Identify and implement <strong>cost optimization measures</strong> across all departments to achieve a 10% reduction in operational expenses.</p>",
        kpis="Monthly cost tracking\nProcess automation count\nVendor renegotiation savings",
        scope=GoalScope.COMPANY_WIDE,
        type=GoalType.QUARTERLY,
        quarter=Quarter.Q2,
        year=2026,
        start_date=date(2026, 4, 1),
        end_date=date(2026, 6, 30),
        progress_percentage=0,
        status=GoalStatus.ACTIVE,
        created_by=admin.id,
    )
    goals.append(g7)

    # ─── DEPARTMENTAL GOALS (6) ───
    g8 = Goal(
        id=uuid.uuid4(),
        title="Migrate Legacy Systems to Cloud Infrastructure",
        description="<p>Complete migration of <strong>all legacy on-premise systems</strong> to cloud infrastructure, improving scalability and reducing maintenance costs.</p>",
        kpis="Systems migrated count\nDowntime during migration\nCost savings achieved",
        scope=GoalScope.DEPARTMENTAL,
        type=GoalType.QUARTERLY,
        quarter=Quarter.Q1,
        year=2026,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 3, 31),
        progress_percentage=45,
        status=GoalStatus.ACTIVE,
        organization_id=eng_dept.id,
        created_by=hod_eng.id,
    )
    goals.append(g8)

    g9 = Goal(
        id=uuid.uuid4(),
        title="Implement Network Monitoring Dashboard",
        description="<p>Build and deploy a <strong>real-time network monitoring dashboard</strong> to track satellite link performance, bandwidth usage, and alert on service degradation.</p>",
        kpis="Dashboard deployment date\nAlert response time improvement\nNetwork visibility coverage",
        scope=GoalScope.DEPARTMENTAL,
        type=GoalType.QUARTERLY,
        quarter=Quarter.Q1,
        year=2026,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 3, 31),
        progress_percentage=70,
        status=GoalStatus.ACTIVE,
        organization_id=it_dept.id,
        created_by=hod_it.id,
    )
    goals.append(g9)

    g10 = Goal(
        id=uuid.uuid4(),
        title="Develop Q1 Sales Campaign for Government Sector",
        description="<p>Plan and execute a <strong>targeted sales campaign</strong> for government agencies, leveraging Nigcomsat's mandate for national satellite communications.</p>",
        kpis="Government leads generated\nProposals submitted\nConversion rate",
        scope=GoalScope.DEPARTMENTAL,
        type=GoalType.QUARTERLY,
        quarter=Quarter.Q1,
        year=2026,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 3, 31),
        progress_percentage=55,
        status=GoalStatus.ACTIVE,
        organization_id=sales_dept.id,
        parent_goal_id=g6.id,
        created_by=hod_sales.id,
    )
    goals.append(g10)

    g11 = Goal(
        id=uuid.uuid4(),
        title="Complete Annual Staff Training Needs Assessment",
        description="<p>Conduct a <strong>comprehensive skills gap analysis</strong> across all departments and develop a targeted training calendar for 2026.</p>",
        kpis="Departments assessed\nTraining plans created\nBudget allocation completed",
        scope=GoalScope.DEPARTMENTAL,
        type=GoalType.QUARTERLY,
        quarter=Quarter.Q1,
        year=2026,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 3, 31),
        progress_percentage=90,
        status=GoalStatus.ACTIVE,
        organization_id=hr_dept.id,
        created_by=hod_hr.id,
    )
    goals.append(g11)

    g12 = Goal(
        id=uuid.uuid4(),
        title="Implement Automated Financial Reporting System",
        description="<p>Deploy an <strong>automated financial reporting pipeline</strong> that generates monthly P&L, balance sheet, and cash flow reports with minimal manual intervention.</p>",
        kpis="Report generation time reduction\nManual errors eliminated\nStakeholder satisfaction",
        scope=GoalScope.DEPARTMENTAL,
        type=GoalType.QUARTERLY,
        quarter=Quarter.Q1,
        year=2026,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 3, 31),
        progress_percentage=30,
        status=GoalStatus.ACTIVE,
        organization_id=finance_dept.id,
        created_by=hod_finance.id,
    )
    goals.append(g12)

    g13 = Goal(
        id=uuid.uuid4(),
        title="Achieve 99.9% Network Uptime for Q1",
        description="<p>Maintain <strong>99.9% uptime</strong> across all satellite communication links through proactive maintenance and rapid incident response.</p>",
        kpis="Uptime percentage\nMean time to recovery\nIncident count",
        scope=GoalScope.DEPARTMENTAL,
        type=GoalType.QUARTERLY,
        quarter=Quarter.Q1,
        year=2026,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 3, 31),
        progress_percentage=95,
        status=GoalStatus.ACTIVE,
        organization_id=it_dept.id,
        parent_goal_id=g2.id,
        created_by=hod_it.id,
    )
    goals.append(g13)

    # ─── INDIVIDUAL GOALS (7) ───
    g14 = Goal(
        id=uuid.uuid4(),
        title="Complete React Performance Optimization Course",
        description="<p>Complete advanced <strong>React performance optimization training</strong> and apply learnings to improve the customer portal load time by 40%.</p>",
        kpis="Course completion\nPortal load time improvement\nLighthouse score",
        scope=GoalScope.INDIVIDUAL,
        type=GoalType.QUARTERLY,
        quarter=Quarter.Q1,
        year=2026,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 3, 31),
        progress_percentage=75,
        status=GoalStatus.ACTIVE,
        owner_id=frontend_lead.id,
        created_by=hod_eng.id,
    )
    goals.append(g14)

    g15 = Goal(
        id=uuid.uuid4(),
        title="Design and Implement API Rate Limiting",
        description="<p>Implement <strong>API rate limiting and throttling</strong> across all public endpoints to prevent abuse and ensure fair usage for all clients.</p>",
        kpis="Rate limiting deployed\nAPI abuse incidents reduced\nClient complaint rate",
        scope=GoalScope.INDIVIDUAL,
        type=GoalType.QUARTERLY,
        quarter=Quarter.Q1,
        year=2026,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 3, 31),
        progress_percentage=50,
        status=GoalStatus.ACTIVE,
        owner_id=backend_lead.id,
        created_by=hod_eng.id,
    )
    goals.append(g15)

    g16 = Goal(
        id=uuid.uuid4(),
        title="Develop Automated Test Suite for Core Modules",
        description="<p>Write <strong>comprehensive unit and integration tests</strong> achieving 80% code coverage for the core billing and subscription modules.</p>",
        kpis="Test coverage percentage\nBug detection rate\nRegression incidents",
        scope=GoalScope.INDIVIDUAL,
        type=GoalType.QUARTERLY,
        quarter=Quarter.Q1,
        year=2026,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 3, 31),
        progress_percentage=35,
        status=GoalStatus.ACTIVE,
        owner_id=staff1.id,
        created_by=frontend_lead.id,
    )
    goals.append(g16)

    g17 = Goal(
        id=uuid.uuid4(),
        title="Refactor Authentication Microservice",
        description="<p>Refactor the authentication service to support <strong>OAuth 2.0 and SAML SSO</strong> for enterprise client integration requirements.</p>",
        kpis="SSO integration completed\nAuthentication latency\nSecurity audit passed",
        scope=GoalScope.INDIVIDUAL,
        type=GoalType.QUARTERLY,
        quarter=Quarter.Q1,
        year=2026,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 3, 31),
        progress_percentage=20,
        status=GoalStatus.ACTIVE,
        owner_id=staff2.id,
        created_by=backend_lead.id,
    )
    goals.append(g17)

    g18 = Goal(
        id=uuid.uuid4(),
        title="Close 5 Enterprise Sales Deals Worth N50M+",
        description="<p>Identify, pursue, and close <strong>5 high-value enterprise deals</strong> each worth N50 million or more from the government and telecommunications sectors.</p>",
        kpis="Deals closed count\nTotal revenue from deals\nAverage deal cycle time",
        scope=GoalScope.INDIVIDUAL,
        type=GoalType.QUARTERLY,
        quarter=Quarter.Q1,
        year=2026,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 3, 31),
        progress_percentage=60,
        status=GoalStatus.ACTIVE,
        owner_id=staff3.id,
        created_by=hod_sales.id,
    )
    goals.append(g18)

    g19 = Goal(
        id=uuid.uuid4(),
        title="Implement Employee Wellness Program",
        description="<p>Design and launch a <strong>comprehensive employee wellness program</strong> including health screenings, fitness initiatives, and mental health support resources.</p>",
        kpis="Program enrollment rate\nEmployee satisfaction improvement\nAbsenteeism reduction",
        scope=GoalScope.INDIVIDUAL,
        type=GoalType.QUARTERLY,
        quarter=Quarter.Q1,
        year=2026,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 3, 31),
        progress_percentage=85,
        status=GoalStatus.ACTIVE,
        owner_id=hod_hr.id,
        created_by=ops_director.id,
    )
    goals.append(g19)

    g20 = Goal(
        id=uuid.uuid4(),
        title="Prepare Q1 2026 Budget Variance Report",
        description="<p>Analyze actual spending against budget allocations and prepare a <strong>detailed variance report</strong> with recommendations for Q2 adjustments.</p>",
        kpis="Report accuracy\nVariance explanations documented\nActionable recommendations count",
        scope=GoalScope.INDIVIDUAL,
        type=GoalType.QUARTERLY,
        quarter=Quarter.Q1,
        year=2026,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 3, 31),
        progress_percentage=40,
        status=GoalStatus.ACTIVE,
        owner_id=hod_finance.id,
        created_by=ops_director.id,
    )
    goals.append(g20)

    # ─── Save all goals ───
    for goal in goals:
        db.add(goal)

    db.commit()

    # Print summary
    company_wide = [g for g in goals if g.scope == GoalScope.COMPANY_WIDE]
    departmental = [g for g in goals if g.scope == GoalScope.DEPARTMENTAL]
    individual = [g for g in goals if g.scope == GoalScope.INDIVIDUAL]
    yearly = [g for g in goals if g.type == GoalType.YEARLY]
    quarterly = [g for g in goals if g.type == GoalType.QUARTERLY]

    print(f"\nDone! Created {len(goals)} goals:")
    print(f"  By Scope:")
    print(f"    - Company-Wide: {len(company_wide)}")
    print(f"    - Departmental: {len(departmental)}")
    print(f"    - Individual:   {len(individual)}")
    print(f"  By Type:")
    print(f"    - Yearly:    {len(yearly)}")
    print(f"    - Quarterly: {len(quarterly)}")
    print(f"\n  Goal hierarchy:")
    print(f"    - '{g1.title}' (Yearly)")
    print(f"      └─ '{g6.title}' (Q1)")
    print(f"         └─ '{g10.title}' (Dept)")
    print(f"    - '{g2.title}' (Yearly)")
    print(f"      ├─ '{g4.title}' (Q1)")
    print(f"      └─ '{g13.title}' (Dept)")
    print(f"    - '{g3.title}' (Yearly)")
    print(f"      └─ '{g5.title}' (Q1)")

except Exception as e:
    db.rollback()
    print(f"Error: {e}")
    raise
finally:
    db.close()
