# Implementation Workplan: Day 1 (Tomorrow)

## Goal: Complete Critical Features by End of Day

**Total Time**: 8 hours (9 AM - 5 PM)
**Focus**: Organization structure, Departmental goals, Initiative sub-tasks

---

## Morning Session (9 AM - 1 PM) - 4 hours

### Task 1: Organization Structure - Add Division Level (2 hours)
**Time**: 9:00 AM - 11:00 AM
**Priority**: CRITICAL (Foundation for other features)

#### Backend Changes (1 hour)
1. **Update models.py** (10 min)
   ```python
   # Add to OrganizationLevel enum
   class OrganizationLevel(str, enum.Enum):
       GLOBAL = "global"
       DIRECTORATE = "directorate"
       DEPARTMENT = "department"
       DIVISION = "division"  # NEW
       UNIT = "unit"
   ```

2. **Create Alembic migration** (15 min)
   ```bash
   cd backend
   alembic revision -m "add_division_level_to_organization"
   ```
   - Update migration to add DIVISION to enum
   - Test rollback

3. **Update organization router** (15 min)
   - Validate Division can only have Department as parent
   - Validate Unit can only have Division as parent
   - Update parent_id validation logic

4. **Test API endpoints** (20 min)
   - Create Global → Directorate → Department → Division → Unit
   - Verify tree structure
   - Test filters and queries

#### Frontend Changes (1 hour)
5. **Update organization page** (30 min)
   - Add Division option to level dropdown
   - Update parent selection logic
   - Add Division badge color
   - Test create/edit/delete

6. **Update user forms** (15 min)
   - Organization selector shows Division level
   - Validate Division selection

7. **Update filters across app** (15 min)
   - Any dropdowns using organization show Division
   - Goal forms, initiative forms, etc.

---

### Task 2: Departmental Goals Implementation (2 hours)
**Time**: 11:00 AM - 1:00 PM
**Priority**: CRITICAL

#### Backend Changes (1 hour)
1. **Update models.py** (10 min)
   ```python
   # Goal model already has organization_id
   # Just need to handle departmental type logic
   class GoalType(str, enum.Enum):
       YEARLY = "YEARLY"
       QUARTERLY = "QUARTERLY"
       DEPARTMENTAL = "DEPARTMENTAL"  # NEW
       INDIVIDUAL = "INDIVIDUAL"
   ```

2. **Update goals router** (30 min)
   - Add DEPARTMENTAL handling in create endpoint
   - Validate department_id required for DEPARTMENTAL
   - Filter departmental goals by user's accessible orgs
   - Add permission check: `goal_create_departmental`

3. **Update goal cascade service** (10 min)
   - Ensure departmental goals can be parent to individual
   - Ensure organizational goals can be parent to departmental

4. **Test API** (10 min)
   - Create departmental goal
   - Link to parent organizational goal
   - Create child individual goal
   - Test cascade achievement

#### Frontend Changes (1 hour)
5. **Update goal create form** (30 min)
   - Add DEPARTMENTAL to type dropdown
   - Show department selector when DEPARTMENTAL selected
   - Hide quarter/year fields for departmental
   - Validate department selected

6. **Add Departmental Goals tab** (20 min)
   - New tab in goals page: "Departmental Goals"
   - Filter goals where type = DEPARTMENTAL
   - Show department name in goal cards
   - Allow department heads to create

7. **Update goal cards** (10 min)
   - Show department badge for departmental goals
   - Show organization badge for organizational goals

---

## Lunch Break (1 PM - 2 PM)

---

## Afternoon Session (2 PM - 6 PM) - 4 hours

### Task 3: Initiative Sub-Tasks Feature (4 hours)
**Time**: 2:00 PM - 6:00 PM
**Priority**: CRITICAL (User explicitly requested)

#### Backend Implementation (2 hours)

1. **Create InitiativeSubTask model** (20 min)
   ```python
   # In models.py
   class InitiativeSubTask(Base):
       __tablename__ = "initiative_subtasks"

       id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
       title = Column(String(255), nullable=False)
       description = Column(Text, nullable=True)
       status = Column(Enum('pending', 'completed', name='subtask_status'),
                      default='pending')
       sequence_order = Column(Integer, default=0)
       completed_at = Column(DateTime(timezone=True), nullable=True)
       created_at = Column(DateTime(timezone=True), server_default=func.now())
       updated_at = Column(DateTime(timezone=True), onupdate=func.now())

       # Foreign Keys
       initiative_id = Column(UUID(as_uuid=True), ForeignKey("initiatives.id"),
                             nullable=False)
       created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"),
                          nullable=False)

       # Relationships
       initiative = relationship("Initiative", back_populates="subtasks")
       creator = relationship("User")
   ```

2. **Update Initiative model** (5 min)
   ```python
   # Add to Initiative class
   subtasks = relationship("InitiativeSubTask", back_populates="initiative",
                          cascade="all, delete-orphan")
   ```

3. **Create Alembic migration** (15 min)
   ```bash
   alembic revision -m "add_initiative_subtasks_table"
   ```

4. **Create sub-task schemas** (15 min)
   ```python
   # In schemas/initiatives.py
   class SubTaskCreate(BaseModel):
       title: str
       description: Optional[str] = None

   class SubTaskUpdate(BaseModel):
       title: Optional[str] = None
       status: Optional[str] = None

   class SubTask(BaseModel):
       id: UUID
       title: str
       description: Optional[str]
       status: str
       sequence_order: int
       completed_at: Optional[datetime]
       created_at: datetime

       class Config:
           from_attributes = True
   ```

5. **Create sub-task API endpoints** (45 min)
   ```python
   # In routers/initiatives.py

   @router.post("/{initiative_id}/subtasks")
   async def create_subtask(
       initiative_id: UUID,
       subtask: SubTaskCreate,
       current_user: UserSession = Depends(get_current_user),
       db: Session = Depends(get_db)
   ):
       # Validate: user is assignee of initiative
       # Validate: initiative status is ONGOING
       # Create subtask
       # Return created subtask

   @router.get("/{initiative_id}/subtasks")
   async def get_subtasks(initiative_id: UUID, ...):
       # Return all subtasks for initiative

   @router.put("/{initiative_id}/subtasks/{subtask_id}")
   async def update_subtask(
       initiative_id: UUID,
       subtask_id: UUID,
       update: SubTaskUpdate,
       ...
   ):
       # Update subtask (title or status)
       # If status changed to completed: set completed_at
       # Calculate initiative progress
       # Return updated subtask

   @router.delete("/{initiative_id}/subtasks/{subtask_id}")
   async def delete_subtask(initiative_id: UUID, subtask_id: UUID, ...):
       # Delete subtask
       # Recalculate initiative progress

   @router.post("/{initiative_id}/subtasks/reorder")
   async def reorder_subtasks(
       initiative_id: UUID,
       subtask_ids: List[UUID],
       ...
   ):
       # Update sequence_order for all subtasks
   ```

6. **Add progress calculation helper** (20 min)
   ```python
   # In utils/initiative_workflows.py
   def calculate_initiative_progress(initiative_id: UUID, db: Session) -> int:
       """Calculate initiative progress from subtasks"""
       subtasks = db.query(InitiativeSubTask).filter(
           InitiativeSubTask.initiative_id == initiative_id
       ).all()

       if not subtasks:
           return 0  # No subtasks = 0% progress

       completed = len([st for st in subtasks if st.status == 'completed'])
       total = len(subtasks)

       return int((completed / total) * 100)
   ```

7. **Test backend** (20 min)
   - Create initiative → start it
   - Add 5 subtasks
   - Mark 2 as completed
   - Verify progress = 40%
   - Delete 1 subtask
   - Verify progress recalculated

---

#### Frontend Implementation (2 hours)

8. **Create SubTask component** (30 min)
   ```jsx
   // components/dashboard/SubTaskItem.jsx
   export function SubTaskItem({ subtask, onToggle, onDelete, onEdit }) {
     return (
       <div className="flex items-center gap-3 p-2 border rounded">
         <Checkbox
           checked={subtask.status === 'completed'}
           onCheckedChange={() => onToggle(subtask.id)}
         />
         <Input
           value={subtask.title}
           onChange={(e) => onEdit(subtask.id, e.target.value)}
           className="flex-1"
         />
         <Button onClick={() => onDelete(subtask.id)} variant="ghost">
           <Trash2 className="h-4 w-4" />
         </Button>
       </div>
     );
   }
   ```

9. **Create SubTaskList component** (30 min)
   ```jsx
   // components/dashboard/SubTaskList.jsx
   export function SubTaskList({ initiativeId, subtasks, onUpdate }) {
     const [newSubTaskTitle, setNewSubTaskTitle] = useState('');

     const handleAdd = async () => {
       await api.post(`/initiatives/${initiativeId}/subtasks`, {
         title: newSubTaskTitle
       });
       setNewSubTaskTitle('');
       onUpdate(); // Refresh
     };

     const handleToggle = async (subtaskId) => {
       const subtask = subtasks.find(st => st.id === subtaskId);
       await api.put(`/initiatives/${initiativeId}/subtasks/${subtaskId}`, {
         status: subtask.status === 'completed' ? 'pending' : 'completed'
       });
       onUpdate();
     };

     // Similar for delete, edit

     const progress = subtasks.length ?
       (subtasks.filter(st => st.status === 'completed').length / subtasks.length) * 100 : 0;

     return (
       <div>
         <div className="flex items-center justify-between mb-4">
           <h3>Sub-Tasks ({completed} of {total})</h3>
           <Progress value={progress} className="w-32" />
         </div>

         {subtasks.map(subtask => (
           <SubTaskItem
             key={subtask.id}
             subtask={subtask}
             onToggle={handleToggle}
             onDelete={handleDelete}
             onEdit={handleEdit}
           />
         ))}

         <div className="flex gap-2 mt-4">
           <Input
             placeholder="Add sub-task..."
             value={newSubTaskTitle}
             onChange={(e) => setNewSubTaskTitle(e.target.value)}
             onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
           />
           <Button onClick={handleAdd}>Add</Button>
         </div>
       </div>
     );
   }
   ```

10. **Integrate into InitiativeDetailModal** (30 min)
    ```jsx
    // In TaskDetailModal component
    // Add sub-tasks section after description, before documents

    {initiative.status === 'ONGOING' && (
      <div className="mb-6">
        <SubTaskList
          initiativeId={initiative.id}
          subtasks={initiative.subtasks || []}
          onUpdate={refetchInitiative}
        />
      </div>
    )}

    // Show sub-task progress in initiative card
    {initiative.subtasks?.length > 0 && (
      <div className="text-sm text-muted-foreground">
        {completed} of {total} sub-tasks completed
      </div>
    )}
    ```

11. **Add React Query hooks** (15 min)
    ```javascript
    // In lib/react-query.js
    export function useSubTasks(initiativeId) {
      return useQuery({
        queryKey: ['subtasks', initiativeId],
        queryFn: () => api.get(`/initiatives/${initiativeId}/subtasks`),
      });
    }

    export function useCreateSubTask() {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: ({ initiativeId, data }) =>
          api.post(`/initiatives/${initiativeId}/subtasks`, data),
        onSuccess: (_, { initiativeId }) => {
          queryClient.invalidateQueries(['subtasks', initiativeId]);
          queryClient.invalidateQueries(['initiative', initiativeId]);
        }
      });
    }

    // Similar for update, delete
    ```

12. **Test frontend** (15 min)
    - Create initiative → start it
    - Add sub-tasks via UI
    - Toggle checkboxes (mark complete)
    - Verify progress bar updates
    - Delete sub-task
    - Edit sub-task title
    - Verify persistence on page refresh

---

## End of Day Review (5:45 PM - 6:00 PM) - 15 min

### Completed Tasks Checklist:
- [ ] Organization structure has Division level (backend + frontend)
- [ ] Division can be created, edited, deleted
- [ ] Departmental goals type added (backend + frontend)
- [ ] Departmental goals tab in UI
- [ ] Department heads can create departmental goals
- [ ] Initiative sub-tasks model and API created
- [ ] Sub-tasks UI integrated in initiative detail view
- [ ] Sub-task progress calculation working
- [ ] All features tested and working

### Testing Protocol:
1. **Organization**: Create full 5-level hierarchy
2. **Goals**: Create yearly → departmental → individual goal chain
3. **Initiatives**: Create initiative → add sub-tasks → toggle completion → verify progress
4. **Integration**: Link initiative to departmental goal → complete initiative → verify goal progress updates

---

## Backup Plan (If Behind Schedule)

### Priority 1 (Must Complete):
1. Organization Division level (foundation)
2. Departmental goals backend
3. Initiative sub-tasks backend

### Priority 2 (Complete if time permits):
4. Departmental goals UI
5. Initiative sub-tasks UI

### Priority 3 (Can defer to Day 2):
6. Polish and edge cases
7. Advanced UI features (drag-drop, etc.)

---

## Day 2 Preview (Quick Reference)

### Task 4: Super Admin Dashboard (4 hours)
- System-wide statistics API endpoint
- Department comparison query
- Dashboard layout with KPI cards
- Real-time activity feed (WebSocket)

### Task 5: Email Templates - Critical 8 (4 hours)
- Initiative approval request
- Initiative overdue
- Extension request/approved/denied
- Goal approval request
- Goal approved/rejected
- Review cycle started
- Review assigned

---

## Notes & Considerations

### Performance Considerations:
- Sub-tasks query should eager-load with initiatives
- Organization tree query should cache for 5 minutes
- Departmental goals filter by user's accessible departments only

### Security Validations:
- Only assignees can create/edit sub-tasks
- Only department heads can create departmental goals for their department
- Only super admin can create/edit Division-level organizations

### Error Handling:
- Graceful failure if sub-tasks fail to load
- Validation errors clearly displayed in forms
- Rollback support for organization structure changes

### Documentation:
- Update API documentation with new endpoints
- Update CLAUDE.md with Division level
- Update workflow docs with final implementation details

---

## Success Metrics

### By End of Day:
- ✅ 3 major features fully implemented and tested
- ✅ No breaking changes to existing functionality
- ✅ All tests passing
- ✅ Code committed and pushed to repository
- ✅ Documentation updated

### Tomorrow Morning:
- Ready to start Day 2 tasks
- No technical debt accumulated
- Clean codebase ready for dashboard and email work
