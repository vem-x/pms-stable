"""Seed script to populate the database with organizations, roles, and 60 users."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine
from models import Organization, OrganizationLevel, Role, ScopeOverride, User, UserStatus
from utils.auth import get_password_hash
from sqlalchemy import text as sa_text
import uuid

db = SessionLocal()

try:
    # ─── Clear existing data ───
    print("Clearing existing data...")
    db.execute(sa_text("TRUNCATE TABLE users, roles, organizations, user_history, refresh_tokens CASCADE"))
    db.commit()

    # ─── Organizations ───
    print("Creating organizations...")

    global_org = Organization(
        id=uuid.uuid4(), name="Nigcomsat Management Office",
        description="Global organization", level=OrganizationLevel.GLOBAL, parent_id=None
    )
    db.add(global_org)
    db.flush()

    directorates = []
    dir_names = [
        ("Technical Directorate", "Technical operations and engineering"),
        ("Marketing Directorate", "Marketing and business development"),
        ("Operations Directorate", "Day-to-day operations management"),
    ]
    for name, desc in dir_names:
        d = Organization(id=uuid.uuid4(), name=name, description=desc,
                         level=OrganizationLevel.DIRECTORATE, parent_id=global_org.id)
        db.add(d)
        directorates.append(d)
    db.flush()

    departments = []
    dept_defs = [
        # Under Technical
        ("Engineering", "Software and systems engineering", 0),
        ("IT Infrastructure", "Network and infrastructure", 0),
        # Under Marketing
        ("Sales", "Sales and client relations", 1),
        ("Communications", "PR and corporate communications", 1),
        # Under Operations
        ("Human Resources", "People management and recruitment", 2),
        ("Finance", "Financial planning and accounting", 2),
        ("Admin Services", "Administrative support", 2),
    ]
    for name, desc, dir_idx in dept_defs:
        dept = Organization(id=uuid.uuid4(), name=name, description=desc,
                            level=OrganizationLevel.DEPARTMENT, parent_id=directorates[dir_idx].id)
        db.add(dept)
        departments.append(dept)
    db.flush()

    units = []
    unit_defs = [
        ("Frontend Team", "Frontend development", 0),
        ("Backend Team", "Backend development", 0),
        ("Network Ops", "Network operations", 1),
        ("Enterprise Sales", "Enterprise client sales", 2),
        ("Recruitment", "Talent acquisition", 4),
        ("Payroll", "Payroll and compensation", 5),
    ]
    for name, desc, dept_idx in unit_defs:
        u = Organization(id=uuid.uuid4(), name=name, description=desc,
                         level=OrganizationLevel.UNIT, parent_id=departments[dept_idx].id)
        db.add(u)
        units.append(u)
    db.flush()

    all_orgs = [global_org] + directorates + departments + units

    # ─── Roles ───
    print("Creating roles...")

    super_admin = Role(
        id=uuid.uuid4(), name="Super Admin", description="Full system access",
        is_leadership=True, scope_override=ScopeOverride.GLOBAL,
        permissions=["system_admin", "user_create", "user_edit", "user_delete",
                     "user_suspend", "user_activate", "user_archive", "user_view_all",
                     "user_history_view", "role_create", "role_edit", "role_delete",
                     "role_assign", "role_view_all", "organization_create",
                     "organization_edit", "organization_delete", "organization_view_all",
                     "goal_create_yearly", "goal_create_quarterly", "goal_create_departmental",
                     "goal_edit", "goal_progress_update", "goal_status_change", "goal_view_all",
                     "task_create", "task_assign", "task_edit", "task_review",
                     "task_view_all", "task_extend_deadline", "task_delete",
                     "reports_generate", "audit_access"]
    )

    director = Role(
        id=uuid.uuid4(), name="Director", description="Directorate leadership",
        is_leadership=True, scope_override=ScopeOverride.NONE,
        permissions=["user_view_all", "user_create", "user_edit",
                     "goal_create_yearly", "goal_create_quarterly", "goal_create_departmental",
                     "goal_edit", "goal_progress_update", "goal_status_change", "goal_view_all",
                     "task_create", "task_assign", "task_review", "task_view_all"]
    )

    hod = Role(
        id=uuid.uuid4(), name="Head of Department", description="Department head",
        is_leadership=True, scope_override=ScopeOverride.NONE,
        permissions=["user_view_all", "user_create", "user_edit",
                     "goal_create_departmental", "goal_edit", "goal_progress_update",
                     "goal_status_change", "goal_view_all",
                     "task_create", "task_assign", "task_review", "task_view_all"]
    )

    team_lead = Role(
        id=uuid.uuid4(), name="Team Lead", description="Unit team lead",
        is_leadership=True, scope_override=ScopeOverride.NONE,
        permissions=["user_view_all", "goal_create_departmental", "goal_edit",
                     "goal_progress_update", "goal_view_all",
                     "task_create", "task_assign", "task_review", "task_view_all"]
    )

    staff = Role(
        id=uuid.uuid4(), name="Staff", description="Regular staff member",
        is_leadership=False, scope_override=ScopeOverride.NONE,
        permissions=["user_view_all", "goal_view_all", "task_create", "task_view_all"]
    )

    hr_manager = Role(
        id=uuid.uuid4(), name="HR Manager", description="HR with global user access",
        is_leadership=True, scope_override=ScopeOverride.GLOBAL,
        permissions=["user_create", "user_edit", "user_view_all", "user_suspend",
                     "user_activate", "user_archive", "user_history_view",
                     "goal_create_departmental", "goal_view_all",
                     "task_create", "task_view_all"]
    )

    all_roles = [super_admin, director, hod, team_lead, staff, hr_manager]
    for r in all_roles:
        db.add(r)
    db.flush()

    # ─── Users ───
    print("Creating 60 users...")

    password_hash = get_password_hash("Password123!")

    user_data = [
        # Admin
        ("admin@nigcomsat.gov.ng", "Adamu", "Bello", None, "Chief Administrator", 17, super_admin, global_org),
        # Directors
        ("t.okafor@nigcomsat.gov.ng", "Tunde", "Okafor", None, "Technical Director", 16, director, directorates[0]),
        ("f.ibrahim@nigcomsat.gov.ng", "Fatima", "Ibrahim", None, "Marketing Director", 16, director, directorates[1]),
        ("k.eze@nigcomsat.gov.ng", "Kenneth", "Eze", None, "Operations Director", 16, director, directorates[2]),
        # HODs
        ("s.adeyemi@nigcomsat.gov.ng", "Samuel", "Adeyemi", None, "Head of Engineering", 15, hod, departments[0]),
        ("n.obi@nigcomsat.gov.ng", "Ngozi", "Obi", "Chidera", "Head of IT Infra", 15, hod, departments[1]),
        ("a.mohammed@nigcomsat.gov.ng", "Amina", "Mohammed", None, "Head of Sales", 15, hod, departments[2]),
        ("b.adewale@nigcomsat.gov.ng", "Babatunde", "Adewale", None, "Head of Communications", 15, hod, departments[3]),
        ("g.nwankwo@nigcomsat.gov.ng", "Grace", "Nwankwo", None, "HR Director", 15, hr_manager, departments[4]),
        ("m.aliyu@nigcomsat.gov.ng", "Musa", "Aliyu", None, "Head of Finance", 15, hod, departments[5]),
        ("d.okeke@nigcomsat.gov.ng", "David", "Okeke", None, "Head of Admin", 15, hod, departments[6]),
        # Team Leads
        ("c.johnson@nigcomsat.gov.ng", "Chioma", "Johnson", None, "Frontend Lead", 13, team_lead, units[0]),
        ("e.williams@nigcomsat.gov.ng", "Emmanuel", "Williams", None, "Backend Lead", 13, team_lead, units[1]),
        ("r.abubakar@nigcomsat.gov.ng", "Rasheed", "Abubakar", None, "Network Lead", 13, team_lead, units[2]),
        ("l.okonkwo@nigcomsat.gov.ng", "Linda", "Okonkwo", None, "Sales Lead", 13, team_lead, units[3]),
        ("p.hassan@nigcomsat.gov.ng", "Patricia", "Hassan", None, "Recruitment Lead", 13, team_lead, units[4]),
        ("j.danjuma@nigcomsat.gov.ng", "Joseph", "Danjuma", None, "Payroll Lead", 13, team_lead, units[5]),
        # Staff members (remaining 43 to reach 60)
        ("o.akande@nigcomsat.gov.ng", "Oluwaseun", "Akande", None, "Software Engineer", 10, staff, departments[0]),
        ("u.nnadi@nigcomsat.gov.ng", "Uche", "Nnadi", None, "Software Engineer", 10, staff, departments[0]),
        ("h.yusuf@nigcomsat.gov.ng", "Halima", "Yusuf", None, "QA Engineer", 9, staff, departments[0]),
        ("i.owolabi@nigcomsat.gov.ng", "Isaac", "Owolabi", None, "DevOps Engineer", 10, staff, departments[0]),
        ("z.abdullahi@nigcomsat.gov.ng", "Zainab", "Abdullahi", None, "UI/UX Designer", 9, staff, departments[0]),
        ("v.nwosu@nigcomsat.gov.ng", "Victor", "Nwosu", None, "Systems Analyst", 10, staff, departments[1]),
        ("w.balogun@nigcomsat.gov.ng", "Wale", "Balogun", None, "Network Engineer", 10, staff, departments[1]),
        ("y.lawal@nigcomsat.gov.ng", "Yetunde", "Lawal", None, "Database Admin", 10, staff, departments[1]),
        ("q.ogunbiyi@nigcomsat.gov.ng", "Quadri", "Ogunbiyi", None, "Security Analyst", 10, staff, departments[1]),
        ("t.chukwu@nigcomsat.gov.ng", "Tochukwu", "Chukwu", None, "Cloud Engineer", 9, staff, departments[1]),
        ("a.fashola@nigcomsat.gov.ng", "Adeola", "Fashola", None, "Sales Executive", 8, staff, departments[2]),
        ("b.okafor2@nigcomsat.gov.ng", "Blessing", "Okafor", None, "Account Manager", 9, staff, departments[2]),
        ("c.musa@nigcomsat.gov.ng", "Clement", "Musa", None, "Business Dev Officer", 8, staff, departments[2]),
        ("d.afolabi@nigcomsat.gov.ng", "Damilola", "Afolabi", None, "Sales Coordinator", 8, staff, departments[2]),
        ("e.igwe@nigcomsat.gov.ng", "Emeka", "Igwe", None, "Client Relations", 9, staff, departments[2]),
        ("f.salami@nigcomsat.gov.ng", "Folake", "Salami", None, "PR Specialist", 9, staff, departments[3]),
        ("g.okoro@nigcomsat.gov.ng", "Godwin", "Okoro", None, "Content Writer", 8, staff, departments[3]),
        ("h.bello@nigcomsat.gov.ng", "Hauwa", "Bello", None, "Social Media Manager", 8, staff, departments[3]),
        ("i.adeleke@nigcomsat.gov.ng", "Idris", "Adeleke", None, "Graphic Designer", 8, staff, departments[3]),
        ("j.ogbonna@nigcomsat.gov.ng", "Janet", "Ogbonna", None, "Events Coordinator", 8, staff, departments[3]),
        ("k.garba@nigcomsat.gov.ng", "Kabiru", "Garba", None, "HR Officer", 9, staff, departments[4]),
        ("l.umeh@nigcomsat.gov.ng", "Lilian", "Umeh", None, "HR Assistant", 7, staff, departments[4]),
        ("m.sani@nigcomsat.gov.ng", "Mohammed", "Sani", None, "Training Officer", 9, staff, departments[4]),
        ("n.ojo@nigcomsat.gov.ng", "Nkechi", "Ojo", None, "Compensation Analyst", 9, staff, departments[4]),
        ("o.jimoh@nigcomsat.gov.ng", "Olumide", "Jimoh", None, "Accountant", 10, staff, departments[5]),
        ("p.ekwueme@nigcomsat.gov.ng", "Peter", "Ekwueme", None, "Financial Analyst", 10, staff, departments[5]),
        ("r.bakare@nigcomsat.gov.ng", "Rashidat", "Bakare", None, "Budget Officer", 9, staff, departments[5]),
        ("s.onwuka@nigcomsat.gov.ng", "Solomon", "Onwuka", None, "Procurement Officer", 9, staff, departments[5]),
        ("t.ahmed@nigcomsat.gov.ng", "Taiwo", "Ahmed", None, "Audit Officer", 9, staff, departments[5]),
        ("u.oladipo@nigcomsat.gov.ng", "Uzoma", "Oladipo", None, "Admin Officer", 8, staff, departments[6]),
        ("v.mustapha@nigcomsat.gov.ng", "Victoria", "Mustapha", None, "Office Manager", 8, staff, departments[6]),
        ("w.chidi@nigcomsat.gov.ng", "Wisdom", "Chidi", None, "Logistics Officer", 7, staff, departments[6]),
        ("x.kayode@nigcomsat.gov.ng", "Xander", "Kayode", None, "Transport Coordinator", 7, staff, departments[6]),
        ("y.ibe@nigcomsat.gov.ng", "Yusuf", "Ibe", None, "Facilities Manager", 8, staff, departments[6]),
        ("a.thompson@nigcomsat.gov.ng", "Aisha", "Thompson", None, "Junior Developer", 7, staff, units[0]),
        ("b.cole@nigcomsat.gov.ng", "Binta", "Cole", None, "Frontend Developer", 9, staff, units[0]),
        ("c.usman@nigcomsat.gov.ng", "Chinedu", "Usman", None, "Backend Developer", 9, staff, units[1]),
        ("d.ogunyemi@nigcomsat.gov.ng", "Dayo", "Ogunyemi", None, "API Developer", 9, staff, units[1]),
        ("e.bassey@nigcomsat.gov.ng", "Esther", "Bassey", None, "Network Technician", 8, staff, units[2]),
        ("f.nnamdi@nigcomsat.gov.ng", "Felix", "Nnamdi", None, "Network Admin", 9, staff, units[2]),
        ("g.abdulrahman@nigcomsat.gov.ng", "Gladys", "Abdulrahman", None, "Sales Rep", 7, staff, units[3]),
        ("h.olatunde@nigcomsat.gov.ng", "Hassan", "Olatunde", None, "Talent Sourcer", 7, staff, units[4]),
        ("i.chima@nigcomsat.gov.ng", "Ifeoma", "Chima", None, "Payroll Analyst", 8, staff, units[5]),
    ]

    created_users = []
    for i, (email, first, last, middle, title, level, role, org) in enumerate(user_data):
        name_parts = [first]
        if middle:
            name_parts.append(middle)
        name_parts.append(last)

        u = User(
            id=uuid.uuid4(),
            email=email,
            name=" ".join(name_parts),
            first_name=first,
            last_name=last,
            middle_name=middle,
            job_title=title,
            level=level,
            role_id=role.id,
            organization_id=org.id,
            status=UserStatus.ACTIVE,
            password_hash=password_hash,
        )
        db.add(u)
        created_users.append(u)

    db.commit()
    print(f"Done! Created:")
    print(f"  - {len(all_orgs)} organizations")
    print(f"  - {len(all_roles)} roles")
    print(f"  - {len(created_users)} users")
    print(f"\nLogin with any email and password: Password123!")
    print(f"Admin account: admin@nigcomsat.gov.ng / Password123!")

except Exception as e:
    db.rollback()
    print(f"Error: {e}")
    raise
finally:
    db.close()
