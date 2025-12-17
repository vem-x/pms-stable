# Initiative Complete Workflow - FINAL VERSION

## Date: 2025-12-17

---

## 🎯 **THE CORRECT WORKFLOW** (As Clarified by User)

### **Scenario 1: I Create Initiative for Myself**
```
1. I create → PENDING_APPROVAL (yellow badge)
2. Supervisor clicks "Approve" → PENDING (cyan badge)
3. I click "Start Initiative" → ONGOING (green badge)
4. I click "Complete" → UNDER_REVIEW (orange badge)
5. Supervisor clicks "Review & Grade" →
   - Approve with grade → APPROVED (emerald badge) ✅
   - Request redo → back to ONGOING
```

### **Scenario 2: Supervisor Creates Initiative for Me**
```
1. Supervisor creates and assigns to me → ASSIGNED (blue badge)
2. I click "Accept" → PENDING (cyan badge)
3. I click "Start Initiative" → ONGOING (green badge)
4. I click "Complete" → UNDER_REVIEW (orange badge)
5. Supervisor clicks "Review & Grade" →
   - Approve with grade → APPROVED (emerald badge) ✅
   - Request redo → back to ONGOING
```

---

## 📊 **Status Definitions - FINAL**

| Status | Badge Color | Who Sees | Button | Action |
|--------|-------------|----------|--------|--------|
| **PENDING_APPROVAL** | Yellow | Supervisor | **"Approve"** | Supervisor approves → PENDING |
| **ASSIGNED** | Blue | Assignee | **"Accept"** | Assignee accepts → PENDING |
| **PENDING** | Cyan | Assignee | **"Start Initiative"** | Start work → ONGOING |
| **ONGOING** | Green | Assignee | **"Complete"** | Done working → UNDER_REVIEW |
| **UNDER_REVIEW** | Orange | Supervisor | **"Review & Grade"** | Approve/Redo |
| **APPROVED** | Emerald | Everyone | None | Final state ✅ |
| **REJECTED** | Red | Creator | None | Supervisor rejected |
| **OVERDUE** | Red | Everyone | **"Request Extension"** | Past deadline |

---

## 🔄 **Button Visibility Logic**

### **For "My Initiatives" Tab** (things assigned to me):

```javascript
// ASSIGNED status
if (status === 'ASSIGNED' && isAssignedToMe) {
  showButton("Accept", () => acceptInitiative(id))
}

// PENDING status
if (status === 'PENDING' && isAssignedToMe) {
  showButton("Start Initiative", () => startInitiative(id))
}

// ONGOING status
if (status === 'ONGOING' && isAssignedToMe) {
  showButton("Complete", () => completeInitiative(id))
}

// UNDER_REVIEW status - waiting
if (status === 'UNDER_REVIEW') {
  showMessage("Waiting for supervisor review")
}
```

### **For "Supervisee Initiatives" Tab** (supervisor view):

```javascript
// PENDING_APPROVAL status
if (status === 'PENDING_APPROVAL') {
  showButton("Approve", () => openApprovalDialog())
}

// UNDER_REVIEW status
if (status === 'UNDER_REVIEW') {
  showButton("Review & Grade", () => openReviewDialog())
}

// Other statuses - just monitoring
else {
  showButton("View", () => openDetailModal())
}
```

---

## 💻 **Backend Implementation - COMPLETE**

### **Statuses Added** ✅
```python
class InitiativeStatus(str, enum.Enum):
    PENDING_APPROVAL = "PENDING_APPROVAL"
    ASSIGNED = "ASSIGNED"
    PENDING = "PENDING"                    # NEW
    ONGOING = "ONGOING"                    # NEW
    UNDER_REVIEW = "UNDER_REVIEW"          # NEW
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    OVERDUE = "OVERDUE"
```

### **Endpoints Added** ✅
```python
PUT /api/initiatives/{id}/approve      # PENDING_APPROVAL → PENDING
PUT /api/initiatives/{id}/accept       # ASSIGNED → PENDING
PUT /api/initiatives/{id}/start        # PENDING → ONGOING
PUT /api/initiatives/{id}/complete     # ONGOING → UNDER_REVIEW
POST /api/initiatives/{id}/review      # UNDER_REVIEW → APPROVED or ONGOING
```

### **Workflow Methods Updated** ✅
- `approve_initiative()` now sets status to PENDING (not ASSIGNED)
- `review_initiative()` checks for UNDER_REVIEW (not COMPLETED)
- `review_initiative()` sends redo back to ONGOING (not STARTED)

---

## 🎨 **Frontend Implementation - IN PROGRESS**

### **Files Updated** ✅
1. `frontend/src/lib/api.js` - Added accept/start/complete methods
2. `frontend/src/lib/react-query.js` - Added useAcceptInitiative, useStartInitiative, useCompleteInitiative hooks
3. `frontend/src/app/dashboard/initiatives/page.js` - Need to add UI buttons

### **Status Colors Updated** ✅
```javascript
const statusColors = {
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-800",
  ASSIGNED: "bg-blue-100 text-blue-800",
  PENDING: "bg-cyan-100 text-cyan-800",           // NEW
  ONGOING: "bg-green-100 text-green-800",         // NEW
  UNDER_REVIEW: "bg-orange-100 text-orange-800",  // NEW
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
  OVERDUE: "bg-red-100 text-red-800"
}
```

### **Hooks Imported** ✅
```javascript
import {
  useAcceptInitiative,
  useStartInitiative,
  useCompleteInitiative,
  useApproveInitiative,
  useReviewInitiative,
  // ... etc
} from "@/lib/react-query"
```

---

## ⚙️ **UI Updates Needed**

### **1. Add Mutation Hooks in Component**

```javascript
function InitiativesPage() {
  const acceptInitiative = useAcceptInitiative()
  const startInitiative = useStartInitiative()
  const completeInitiative = useCompleteInitiative()
  const approveInitiative = useApproveInitiative()
  const reviewInitiative = useReviewInitiative()

  // ... rest of component
}
```

### **2. Add Button Handlers**

```javascript
// Accept ASSIGNED initiative
const handleAccept = (initiativeId) => {
  acceptInitiative.mutate(initiativeId, {
    onSuccess: () => {
      // Refetch initiatives
    }
  })
}

// Start PENDING initiative
const handleStart = (initiativeId) => {
  startInitiative.mutate(initiativeId, {
    onSuccess: () => {
      // Refetch initiatives
    }
  })
}

// Complete ONGOING initiative
const handleComplete = (initiativeId) => {
  completeInitiative.mutate(initiativeId, {
    onSuccess: () => {
      // Refetch initiatives
    }
  })
}
```

### **3. Update Initiative Card Rendering**

```javascript
// In initiative card rendering
<div className="flex gap-2">
  {/* ASSIGNED - Show Accept button */}
  {initiative.status === 'ASSIGNED' && isAssignedToMe && (
    <Button onClick={() => handleAccept(initiative.id)}>
      <Check className="mr-2 h-4 w-4" />
      Accept
    </Button>
  )}

  {/* PENDING - Show Start button */}
  {initiative.status === 'PENDING' && isAssignedToMe && (
    <Button onClick={() => handleStart(initiative.id)}>
      <Play className="mr-2 h-4 w-4" />
      Start Initiative
    </Button>
  )}

  {/* ONGOING - Show Complete button */}
  {initiative.status === 'ONGOING' && isAssignedToMe && (
    <Button onClick={() => handleComplete(initiative.id)}>
      <CheckCircle className="mr-2 h-4 w-4" />
      Complete
    </Button>
  )}

  {/* PENDING_APPROVAL - Supervisor approves */}
  {initiative.status === 'PENDING_APPROVAL' && isSupervisor && (
    <Button onClick={() => setApprovingInitiative(initiative)}>
      <Check className="mr-2 h-4 w-4" />
      Approve
    </Button>
  )}

  {/* UNDER_REVIEW - Supervisor reviews */}
  {initiative.status === 'UNDER_REVIEW' && isSupervisor && (
    <Button onClick={() => setReviewingInitiative(initiative)}>
      <Star className="mr-2 h-4 w-4" />
      Review & Grade
    </Button>
  )}

  {/* Always show View button */}
  <Button variant="outline" onClick={() => openDetailModal(initiative)}>
    <Eye className="mr-2 h-4 w-4" />
    View
  </Button>
</div>
```

---

## 🧪 **Testing Checklist**

### **Test 1: Self-Created Initiative**
- [ ] Login as John
- [ ] Create initiative for myself
- [ ] Status = PENDING_APPROVAL (yellow badge)
- [ ] Login as Mike (supervisor)
- [ ] See "Approve" button, click it
- [ ] Status = PENDING (cyan badge)
- [ ] Login as John
- [ ] See "Start Initiative" button, click it
- [ ] Status = ONGOING (green badge)
- [ ] See "Complete" button, click it
- [ ] Status = UNDER_REVIEW (orange badge)
- [ ] Login as Mike
- [ ] See "Review & Grade" button, click it
- [ ] Approve with grade 8/10
- [ ] Status = APPROVED (emerald badge) ✅

### **Test 2: Supervisor-Created Initiative**
- [ ] Login as Mike
- [ ] Create initiative for John
- [ ] Status = ASSIGNED (blue badge)
- [ ] Login as John
- [ ] See "Accept" button, click it
- [ ] Status = PENDING (cyan badge)
- [ ] See "Start Initiative" button, click it
- [ ] Status = ONGOING (green badge)
- [ ] Continue as Test 1 above

### **Test 3: Redo Flow**
- [ ] Follow Test 1 up to UNDER_REVIEW
- [ ] Mike clicks "Review & Grade"
- [ ] Select "Request Redo"
- [ ] Add feedback: "Please add more details"
- [ ] Status = ONGOING (back to work)
- [ ] John sees feedback
- [ ] John clicks "Complete" again
- [ ] Status = UNDER_REVIEW
- [ ] Mike approves this time
- [ ] Status = APPROVED ✅

---

## 📝 **Summary**

### **Backend** ✅ COMPLETE
- Statuses: PENDING, ONGOING, UNDER_REVIEW added
- Endpoints: /accept, /start, /complete added
- Workflow methods updated

### **Frontend API & Hooks** ✅ COMPLETE
- API methods added
- React Query mutations added
- Status colors updated

### **Frontend UI** ⏳ IN PROGRESS
- Imports done
- Status colors done
- Need to add buttons to initiative cards

---

## 🎯 **Next Step**

Update `frontend/src/app/dashboard/initiatives/page.js` to add the action buttons (Accept, Start, Complete) based on initiative status and user role.

The logic is simple:
1. Check initiative status
2. Check if user is assignee or supervisor
3. Show appropriate button
4. Call corresponding mutation when clicked
