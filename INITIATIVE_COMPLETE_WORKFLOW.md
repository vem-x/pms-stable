# Initiative System - Complete Workflow Guide

## Date: 2025-12-17

---

## 🔄 **THE COMPLETE WORKFLOW** (As Clarified)

```
CREATE → PENDING_APPROVAL → ASSIGNED → STARTED → COMPLETED → APPROVED
         (Supervisor)      (Assignee)  (Work)     (Submit)    (Grade)

                                                   ↓ (if redo requested)
                                                 STARTED (fix & resubmit)
```

---

## 📊 **Status Meanings - EXACT DEFINITIONS**

### **1. PENDING_APPROVAL** (Yellow Badge)
**What it means**: Waiting for supervisor to approve before any work can begin

**Who created it**: The person who wants to do the work (often for themselves)

**Who needs to act**: The creator's supervisor

**Action Available**: **"Approve"** button (for supervisor)

**What happens when approved**: Status → **ASSIGNED**

**Example**:
- John creates an initiative for himself
- Status = PENDING_APPROVAL
- Mike (John's supervisor) must approve it

---

### **2. ASSIGNED** (Blue Badge)
**What it means**: Supervisor approved and assigned the work to me, waiting for me to accept/start

**This is like**: "Pending acceptance by assignee"

**Who needs to act**: The assignee (person who will do the work)

**Action Available**: **"Start Initiative"** button (for assignee)

**What happens when started**: Status → **STARTED**

**Example**:
- Mike approved John's initiative
- Status = ASSIGNED
- John sees "Start Initiative" button
- John clicks it to indicate he's beginning work

---

### **3. STARTED** (Green Badge)
**What it means**: I'm actively working on this initiative

**Who is working**: The assignee

**Actions Available**:
- **"Submit Initiative"** button (when done)
- Can add progress updates

**What happens when submitted**:
- Must provide report + documents
- Status → **COMPLETED**

**Example**:
- John is working on the initiative
- When done, clicks "Submit Initiative"
- Uploads report and documents
- Status changes to COMPLETED

---

### **4. COMPLETED** (Orange Badge)
**What it means**: Work is done and submitted, waiting for supervisor to review

**Alternative name**: "UNDER_REVIEW" (same thing)

**Who needs to act**: The supervisor (or whoever created the initiative)

**Actions Available**: **"Review & Grade"** button

**Two possible outcomes**:

#### **Option A: Approve with Grade**
- Supervisor provides score (1-10)
- Optional feedback
- Status → **APPROVED** ✅

#### **Option B: Request Redo**
- Supervisor provides detailed feedback on what needs fixing
- Status → **STARTED** (back to work)
- Assignee must fix issues and resubmit

**Example**:
- John submitted his work with report and documents
- Status = COMPLETED
- Mike (supervisor) reviews it
- If good: Mike approves with grade 8/10 → APPROVED
- If needs work: Mike requests redo with notes → back to STARTED

---

### **5. APPROVED** (Purple Badge)
**What it means**: Initiative is complete, graded, and finalized

**Contains**:
- Final grade/score (1-10)
- Supervisor feedback
- All submission documents

**This is**: The final successful state ✨

**What happens**:
- Score counts toward performance metrics
- Initiative archived as completed

**Example**:
- Mike approved John's work with 8/10 grade
- Status = APPROVED
- John can see his grade and feedback
- Counts toward John's performance review

---

### **6. REJECTED** (Red Badge - Rare)
**What it means**: Supervisor rejected the initiative during PENDING_APPROVAL stage

**Why this happens**: Supervisor doesn't think the initiative should be done at all

**Example**:
- John proposes an initiative
- Mike rejects it completely (not redo - complete rejection)
- Work never begins

---

### **7. OVERDUE** (Red Badge)
**What it means**: Past due date and not yet APPROVED

**Can happen at**: Any status before APPROVED

**What to do**: Request deadline extension

---

## 🎯 **TWO MAIN SCENARIOS EXPLAINED**

### **Scenario A: I Create Initiative for Myself**

**Step-by-Step**:

1. **I create initiative** and assign to myself
   - Status: **PENDING_APPROVAL**
   - I see it in "My Initiatives" with yellow indicator

2. **My supervisor approves**
   - They see it in "Supervisee Initiatives"
   - They click **"Approve"** button
   - Status: **ASSIGNED**

3. **I accept and start working**
   - I see **"Start Initiative"** button
   - I click it
   - Status: **STARTED**

4. **I complete the work**
   - I click **"Submit Initiative"**
   - I add report + documents
   - Status: **COMPLETED**

5. **My supervisor reviews**
   - They see **"Review & Grade"** button
   - Two options:
     - **Approve**: Give grade → Status: **APPROVED** ✅
     - **Request Redo**: Give feedback → Status: **STARTED** (I fix and resubmit)

---

### **Scenario B: Supervisor Creates Initiative for Me**

**Step-by-Step**:

1. **Supervisor creates initiative** and assigns to me
   - Status: **PENDING_APPROVAL**

2. **Supervisor's supervisor approves** (if needed)
   - OR goes directly to **ASSIGNED** if no approval needed

3. **I see it assigned to me**
   - Status: **ASSIGNED**
   - I see **"Start Initiative"** button

4. **I start working**
   - I click **"Start Initiative"**
   - Status: **STARTED**

5. **I submit when done**
   - Report + documents
   - Status: **COMPLETED**

6. **Supervisor reviews and grades**
   - Either approves with grade → **APPROVED**
   - Or requests redo → back to **STARTED**

---

## 🖥️ **BUTTON VISIBILITY MATRIX**

| My Status | I See Button | Supervisor Sees Button |
|-----------|--------------|------------------------|
| **PENDING_APPROVAL** | (waiting) | **"Approve"** (green) |
| **ASSIGNED** | **"Start Initiative"** (blue) | (monitoring) |
| **STARTED** | **"Submit Initiative"** (orange) | (monitoring) |
| **COMPLETED** | (waiting) | **"Review & Grade"** (purple) |
| **APPROVED** | (done ✅) | (done ✅) |

---

## 📝 **WHAT WAS FIXED**

### **Backend Fixes**

1. ✅ **Fixed review_initiative method**
   - Changed check from `PENDING_REVIEW` (doesn't exist) to `COMPLETED`
   - When redo requested, changes status to `STARTED` (not `ONGOING`)
   - Both creator and supervisor can review

2. ✅ **Updated docstrings**
   - Clarified workflow transitions
   - Explained approve vs redo logic

**File**: `backend/utils/initiative_workflows.py`

---

### **Frontend Fixes**

1. ✅ **Updated Review Dialog**
   - Added **"Approve & Grade"** vs **"Request Redo"** buttons
   - Grade only shown when approving
   - Feedback required when requesting redo
   - Clear visual distinction (green vs red)

2. ✅ **Simplified Initiative Cards**
   - Removed type and urgency badges (too cluttered)
   - Only showing status badge now
   - Cleaner interface

**File**: `frontend/src/app/dashboard/initiatives/page.js`

---

## 🎨 **NEW REVIEW DIALOG**

### **Visual Layout**:

```
┌────────────────────────────────────────┐
│ Review & Grade Initiative              │
├────────────────────────────────────────┤
│                                        │
│ Decision:                              │
│ ┌──────────────┐  ┌──────────────┐   │
│ │ ✓ Approve &  │  │  ✗ Request   │   │
│ │   Grade      │  │    Redo       │   │
│ └──────────────┘  └──────────────┘   │
│                                        │
│ Grade (1-10): [Select ▼]              │
│ Rate the quality and completion        │
│                                        │
│ Feedback:                              │
│ ┌──────────────────────────────────┐  │
│ │ [Text area for feedback]         │  │
│ └──────────────────────────────────┘  │
│                                        │
│           [Cancel] [Approve & Submit]  │
└────────────────────────────────────────┘
```

### **Behavior**:

**When "Approve & Grade" selected**:
- Shows grade selector (1-10)
- Feedback is optional
- Button text: "Approve & Submit Grade"
- Green color scheme

**When "Request Redo" selected**:
- Hides grade selector
- Feedback is REQUIRED
- Button text: "Request Redo"
- Red color scheme
- Shows warning: "Be specific about what needs to be changed"

---

## 🧪 **COMPLETE TESTING CHECKLIST**

### **Test Case 1: Create for Self - Happy Path**

1. [ ] Login as John
2. [ ] Create initiative for yourself
3. [ ] Verify status = PENDING_APPROVAL (yellow badge)
4. [ ] Login as Mike (John's supervisor)
5. [ ] Go to "Supervisee Initiatives" tab
6. [ ] See John's initiative with **"Approve"** button
7. [ ] Click Approve
8. [ ] Verify status = ASSIGNED (blue badge)
9. [ ] Login back as John
10. [ ] See **"Start Initiative"** button
11. [ ] Click Start
12. [ ] Verify status = STARTED (green badge)
13. [ ] Click **"Submit Initiative"**
14. [ ] Add report + upload documents
15. [ ] Verify status = COMPLETED (orange badge)
16. [ ] Login as Mike
17. [ ] See **"Review & Grade"** button
18. [ ] Click it, select "Approve & Grade"
19. [ ] Choose grade 8/10, add feedback
20. [ ] Submit
21. [ ] Verify status = APPROVED (purple badge) ✅

---

### **Test Case 2: Redo Request Flow**

1. [ ] Follow steps 1-15 from Test Case 1
2. [ ] Login as Mike, click **"Review & Grade"**
3. [ ] Select **"Request Redo"**
4. [ ] Add feedback: "Please add more details to section 3"
5. [ ] Submit
6. [ ] Verify status = STARTED (back to work)
7. [ ] Login as John
8. [ ] See feedback about what needs fixing
9. [ ] Click **"Submit Initiative"** again with corrections
10. [ ] Status → COMPLETED
11. [ ] Mike reviews again → Approves with grade
12. [ ] Status → APPROVED ✅

---

## 📊 **STATUS COLORS**

| Status | Badge Color | Meaning |
|--------|-------------|---------|
| PENDING_APPROVAL | Yellow | Waiting for approval |
| ASSIGNED | Blue | Ready to start |
| STARTED | Green | Work in progress |
| COMPLETED | Orange | Under review |
| APPROVED | Purple | Done! |
| REJECTED | Red | Not approved |
| OVERDUE | Red | Past deadline |

---

## 🎯 **KEY TAKEAWAYS**

1. ✅ **PENDING_APPROVAL** = Waiting for supervisor approval
2. ✅ **ASSIGNED** = "Pending acceptance/start by assignee"
3. ✅ **STARTED** = Active work phase
4. ✅ **COMPLETED** = "Under review" by supervisor
5. ✅ **APPROVED** = Final state with grade

6. ✅ Supervisor can **Approve with grade** OR **Request redo**
7. ✅ Redo sends status back to **STARTED** with feedback
8. ✅ Assignee must fix and resubmit
9. ✅ Only status badge shown (removed clutter)

---

## 🚀 **READY TO TEST!**

The complete workflow is now implemented exactly as described:
- Approval flow works correctly
- Start/accept button for ASSIGNED status
- Submit with report + documents
- Review with approve OR redo options
- Redo sends back to STARTED
- Approval requires grade

**Test it end-to-end following the testing checklist above!** ✨
