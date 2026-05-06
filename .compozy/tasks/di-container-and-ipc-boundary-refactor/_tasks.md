# DI Container and IPC Boundary Refactor — Task List

## Tasks

| # | Title | Status | Complexity | Dependencies |
|---|-------|--------|------------|--------------|
| 01 | Adjust Public IPC Contracts | completed | critical | — |
| 02 | Extract Public IPC API | completed | high | task_01 |
| 03 | Clean Shared Domain Types Boundary | completed | high | task_01, task_02 |
| 04 | Modularize Main Container Bootstrap | completed | critical | task_01 |
| 05 | Complete Wiring and Boundary Cleanup | pending | critical | task_02, task_03, task_04 |
