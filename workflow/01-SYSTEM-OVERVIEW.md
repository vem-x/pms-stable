# PMS System Overview

## Architecture
- **Backend**: FastAPI (Python) + PostgreSQL + SQLAlchemy
- **Frontend**: Next.js 15 + React 19 + TailwindCSS
- **Auth**: JWT tokens with role-based permissions
- **Real-time**: WebSocket for live notifications
- **Email**: Resend API

## Organization Structure (5 Levels)
```
Global (Company-wide)
  ├─ Directorate (Major divisions)
      ├─ Department (Functional units)
          ├─ Division (Sub-departments)
              └─ Unit (Teams)
```

## Goal Types (3 Levels)
1. **ORGANIZATIONAL** (YEARLY/QUARTERLY) - Company-wide goals
2. **DEPARTMENTAL** - Department/Directorate-specific goals
3. **INDIVIDUAL** - Employee personal goals (requires approval)

## Initiative System
- **Initiative** = Main task/project
- **Sub-Tasks** = Breakdown tasks within initiative (NEW FEATURE)
- Supervisor assessment with scoring (1-10)

## User Roles & Permissions
- **Super Admin**: Full system access
- **Department Heads**: Departmental scope + leadership
- **Supervisors**: Team management + approval rights
- **Employees**: Personal goals + initiatives
- **HR**: Global scope override (can access all data)

## Core Workflows
1. **User Onboarding**: Create → Email invite → Set password → Activate
2. **Goal Setting**: Create → Link parent → Track progress → Achieve
3. **Initiative Lifecycle**: Create → Approve → Execute → Submit → Review → Complete
4. **Performance Review**: Cycle → Assignments → Complete → Score → Calibrate
