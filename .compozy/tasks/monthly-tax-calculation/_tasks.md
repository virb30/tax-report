# Monthly Tax Calculation — Task List

## Tasks

| # | Title | Status | Complexity | Dependencies |
|---|-------|--------|------------|--------------|
| 01 | Persist monthly tax close artifacts | completed | medium | — |
| 02 | Extend upstream dependencies for monthly recalculation | completed | medium | — |
| 03 | Implement monthly asset classification and IRRF allocation services | completed | medium | task_02 |
| 04 | Build the monthly tax calculator and workspace state resolver | pending | high | task_01, task_03 |
| 05 | Add monthly history, detail, and recalculation use cases | pending | high | task_01, task_02, task_04 |
| 06 | Expose monthly close through module wiring and IPC contracts | pending | medium | task_05 |
| 07 | Create the monthly tax workspace and history navigation | pending | medium | task_06 |
| 08 | Implement month detail and guided repair CTAs | pending | medium | task_06, task_07 |
