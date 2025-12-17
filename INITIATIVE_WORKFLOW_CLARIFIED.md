# Initiative Workflow - Complete Guide

## Date: 2025-12-17

---

## 📋 **Initiative Workflow Explained**

### **The Complete Flow**

```
CREATE → PENDING_APPROVAL → ASSIGNED → STARTED → COMPLETED → APPROVED
```

---

## 🔄 **Status Breakdown**

### **1. PENDING_APPROVAL**
**What it means**: Waiting for supervisor approval before work can begin

**Who sees it**:
- Creator (in "My Initiatives")
- Supervisor (in "Supervisee Initiatives" with **Approve** button)

**What happens**:
- Supervisor reviews the initiative
- Supervisor clicks **"Approve"** button or rejects it
- If approved → Status changes to **ASSIGNED**
- If rejected → Status changes to **REJECTED**

**Key Point**: No work can start until supervisor approves!

---

### **2. ASSIGNED**
**What it means**: Approved by supervisor, waiting for assignee to accept/start

**Who sees it**:
- Assignee (with **"Start Initiative"** button)
- Creator (monitoring status)

**What happens**:
- Assignee reviews the initiative
- Assignee clicks **"Start Initiative"** button
- Status changes to **STARTED**

**Key Point**: This is like "pending acceptance" from the assignee's side

---

### **3. STARTED**
**What it means**: Assignee is actively working on the initiative

**Who sees it**:
- Assignee (with **"Submit Initiative"** button)
- Creator (monitoring progress)

**What happens**:
- Assignee works on the initiative
- When done, assignee clicks **"Submit Initiative"**
- Submits report + documents
- Status changes to **COMPLETED**

**Key Point**: Active work phase

---

### **4. COMPLETED**
**What it means**: Submitted by assignee, waiting for creator's review

**Who sees it**:
- Creator (with **"Review Initiative"** button)
- Assignee (waiting for feedback)

**What happens**:
- Creator reviews submission (report + documents)
- Creator scores it (1-10 scale)
- Creator provides feedback
- Status changes to **APPROVED**

**Key Point**: Evaluation phase

---

### **5. APPROVED**
**What it means**: Initiative is complete, scored, and finalized

**Who sees it**:
- Everyone involved

**What happens**:
- Nothing! This is the final state
- Score is recorded
- Counts toward performance metrics

**Key Point**: Done! ✅

---

### **6. REJECTED** (Optional)
**What it means**: Supervisor rejected the initiative during approval

**Who sees it**:
- Creator
- Would-be assignee

**What happens**:
- Initiative is not worked on
- Reason for rejection is recorded

---

### **7. OVERDUE**
**What it means**: Past due date and not yet approved

**Applies to**: Any status before APPROVED
**Can request**: Deadline extension

---

## 🎯 **Two Main Scenarios**

### **Scenario A: Create Initiative for Yourself**

**Steps**:
1. **You create** initiative, assign to yourself → **PENDING_APPROVAL**
2. **Your supervisor** sees it in "Supervisee Initiatives" → Clicks **Approve** → **ASSIGNED**
3. **You** see "Start Initiative" button → Click it → **STARTED**
4. **You** work on it → Submit when done → **COMPLETED**
5. **Creator (you or supervisor)** reviews and scores → **APPROVED**

**Key**: Even if you create it for yourself, your supervisor must approve before you start!

---

### **Scenario B: Create Initiative for Someone Else**

**Steps**:
1. **You create** initiative, assign to colleague → **PENDING_APPROVAL**
2. **Your supervisor** (or the assignee's supervisor) approves → **ASSIGNED**
3. **Assignee** sees "Start Initiative" button → Accepts and starts → **STARTED**
4. **Assignee** submits when done → **COMPLETED**
5. **You (creator)** review and score → **APPROVED**

**Key**: Assignee must accept/start it before they can work on it!

---

## 🖥️ **What Changed in the UI**

### **1. Approval Button Now Visible**
**Before**: Hidden due to incorrect logic
**After**: Shows for all PENDING_APPROVAL initiatives in "Supervisee Initiatives" tab

```javascript
// Simplified logic - if it's pending approval, show the button
{isPendingApproval && (
  <Button onClick={approve}>Approve</Button>
)}
```

---

### **2. Badges Simplified**
**Before**: Status + Type + Urgency badges (cluttered)
**After**: Only Status badge shown

**Example**:
```
Before: [PENDING APPROVAL] [INDIVIDUAL] [HIGH PRIORITY]
After:  [PENDING APPROVAL]
```

---

### **3. Tab Name Clarified**
**Changed**: "Team Initiatives" → "Supervisee Initiatives"
**Why**: Clearer that it's for direct reports, not general team

---

## 🔑 **Key Clarifications**

### **PENDING_APPROVAL vs ASSIGNED**

| Status | Meaning | Action Needed |
|--------|---------|---------------|
| **PENDING_APPROVAL** | Waiting for supervisor to approve before work starts | Supervisor must approve |
| **ASSIGNED** | Approved by supervisor, waiting for assignee to start | Assignee must accept/start |

**Important**: ASSIGNED is essentially "pending acceptance by assignee"

---

### **Who Can Approve?**

**Supervisor approves initiatives created by their supervisees**:
- If John creates an initiative (for himself or others)
- John's supervisor (Mike) must approve it
- Mike sees it in "Supervisee Initiatives" tab
- Mike clicks "Approve" button

---

### **Who Can Review?**

**Creator reviews completed initiatives**:
- Whoever created the initiative reviews it when completed
- Scores it (1-10)
- Provides feedback
- Marks as APPROVED

---

## 📊 **Status Visibility Matrix**

| Status | My Initiatives | Supervisee Initiatives | Buttons Available |
|--------|----------------|------------------------|-------------------|
| PENDING_APPROVAL | ✅ (as creator) | ✅ (as supervisor) | **Approve** (supervisor) |
| ASSIGNED | ✅ (as assignee) | ✅ (as supervisor) | **Start** (assignee) |
| STARTED | ✅ (as assignee) | ✅ (as supervisor) | **Submit** (assignee) |
| COMPLETED | ✅ (all involved) | ✅ (as supervisor) | **Review** (creator) |
| APPROVED | ✅ (all involved) | ✅ (as supervisor) | None (done!) |

---

## 🧪 **Testing the Complete Flow**

### **Test Case: Create Initiative for Yourself**

1. **Login as John** (`john.doe@nigcomsat.gov.ng` / `password123`)
2. **Create initiative**:
   - Title: "Test My Initiative"
   - Check "Create for myself"
   - Submit
   - **Result**: Status = PENDING_APPROVAL

3. **Login as Mike** (John's supervisor: `mike.johnson@nigcomsat.gov.ng` / `password123`)
4. **Go to "Supervisee Initiatives" tab**
5. **See John's initiative** with yellow highlight
6. **Click "Approve" button**
   - **Result**: Status = ASSIGNED

7. **Login back as John**
8. **Go to "My Initiatives"**
9. **See initiative** with status ASSIGNED
10. **Open detail modal** → Click **"Start Initiative"**
    - **Result**: Status = STARTED

11. **Click "Submit Initiative"**
    - Fill report
    - Upload documents
    - Submit
    - **Result**: Status = COMPLETED

12. **Login as creator** (could be John or Mike depending on who created)
13. **Review initiative**:
    - Score (1-10)
    - Provide feedback
    - **Result**: Status = APPROVED ✅

---

## 📝 **Summary of Fixes**

### **What Was Fixed**

1. ✅ **Approval button now shows** for supervisors viewing supervisee initiatives
2. ✅ **Removed unnecessary check** (`createdBySupervisee`) - if it's in the list, it's already filtered
3. ✅ **Simplified badges** - only showing status, removed type and urgency
4. ✅ **Clarified workflow** - documented complete flow with all status meanings

### **What Was Clarified**

1. ✅ **PENDING_APPROVAL** = Waiting for supervisor approval
2. ✅ **ASSIGNED** = Approved, waiting for assignee to start ("pending acceptance")
3. ✅ **Supervisor must approve** all initiatives created by supervisees
4. ✅ **Assignee must start** initiatives before they can work on them

---

## 🚀 **Ready to Test!**

The workflow is now clear and the approve button is working. Test it by:
1. Creating an initiative for yourself
2. Having your supervisor approve it
3. Starting and completing it
4. Getting it reviewed and approved

**Everything should flow smoothly now!** ✨
