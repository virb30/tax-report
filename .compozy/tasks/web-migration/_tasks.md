# Web Migration — Task List

## Tasks

| # | Title | Status | Complexity | Dependencies |
|---|-------|--------|------------|--------------|
| 01 | Create Independent Backend and Frontend Project Shells | completed | medium | — |
| 02 | Move Backend Code into the Backend Project | completed | critical | task_01 |
| 03 | Add Express Server Core and Backend Runtime | completed | high | task_02 |
| 04 | Expose Core Workflow HTTP API Routes | completed | critical | task_03 |
| 05 | Move Frontend Code and Define API Boundary | completed | high | task_01 |
| 06 | Convert Frontend Workflows to HTTP API | completed | critical | task_04, task_05 |
| 07 | Update Web Project Documentation | completed | medium | task_03, task_05, task_06 |
| 08 | Retire Desktop Distribution Path After Parity Gate | completed | critical | task_06, task_07 |
