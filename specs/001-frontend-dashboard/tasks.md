# Tasks: 微信公众号前端管理看板

**Input**: Design documents from `/specs/001-frontend-dashboard/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: 当前规格未显式要求 TDD 或额外测试先行，因此本任务清单不单独生成测试优先任务；实现阶段可在相关模块补充必要测试。

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 初始化前后端项目骨架与基础依赖

- [X] T001 Create backend skeleton directories in `backend/api/`, `backend/services/`, `backend/models/`, `backend/storage/`, and `backend/tests/`
- [X] T002 Create Vite frontend application scaffold in `frontend/` with source directories under `frontend/src/components/`, `frontend/src/pages/`, `frontend/src/services/`, `frontend/src/stores/`, and `frontend/src/types/`
- [X] T003 [P] Add backend dependency manifest for API service and persistence in `backend/requirements.txt`
- [X] T004 [P] Add frontend dependency manifest and scripts in `frontend/package.json`
- [X] T005 Create backend application entrypoint and router registration in `backend/app.py`
- [X] T006 [P] Create frontend application entry and base layout in `frontend/src/main.ts` and `frontend/src/App.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 所有用户故事共享的核心基础设施

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Create SQLite connection and initialization utilities in `backend/storage/database.py`
- [X] T008 [P] Define shared persistence models for accounts, settings, batches, articles, and task events in `backend/models/schema.py`
- [X] T009 [P] Implement repository helpers for accounts, settings, batches, and articles in `backend/storage/repositories.py`
- [X] T010 Implement task manager for single-active-crawl enforcement in `backend/services/task_manager.py`
- [X] T011 [P] Create backend config loader and runtime settings adapter in `backend/services/settings_service.py`
- [X] T012 [P] Wrap existing root crawler modules for backend reuse in `backend/services/crawler_service.py`
- [X] T013 Implement shared API response/error handling and router mounting in `backend/api/__init__.py` and `backend/api/deps.py`
- [X] T014 [P] Create frontend API client and shared request helpers in `frontend/src/services/http.ts`
- [X] T015 [P] Create shared frontend types for account, settings, batch, article, and task status in `frontend/src/types/api.ts`
- [X] T016 Implement global frontend state for current task, settings, and selected batch in `frontend/src/stores/appStore.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - 公众号管理 (Priority: P1) 🎯 MVP

**Goal**: 让用户可以在前端添加、删除、勾选公众号，并将列表持久化保存

**Independent Test**: 在前端添加 3 个公众号、删除 1 个、勾选 2 个后刷新页面，列表和勾选状态仍然正确。

### Implementation for User Story 1

- [X] T017 [US1] Implement account CRUD service in `backend/services/account_service.py`
- [X] T018 [P] [US1] Implement account list and create endpoints in `backend/api/accounts.py`
- [X] T019 [P] [US1] Implement account update and delete endpoints in `backend/api/accounts.py`
- [X] T020 [P] [US1] Implement frontend account service methods for account APIs in `frontend/src/services/accounts.ts`
- [X] T021 [P] [US1] Build account management page UI in `frontend/src/pages/AccountsPage.tsx`
- [X] T022 [P] [US1] Build reusable account list and account form components in `frontend/src/components/AccountList.tsx` and `frontend/src/components/AccountForm.tsx`
- [X] T023 [US1] Connect account page interactions with global store in `frontend/src/stores/appStore.ts`
- [X] T024 [US1] Wire account management page into main app navigation in `frontend/src/App.tsx`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - 文章爬取与结果查看 (Priority: P1)

**Goal**: 让用户选择公众号后发起单轮爬取，查看实时进度、当前结果与历史批次详情

**Independent Test**: 选择至少 1 个公众号并发起爬取，界面在 2 秒内显示任务状态，完成后可查看文章列表和正文；再次发起时若已有任务运行会得到明确阻止或等待提示。

### Implementation for User Story 2

- [X] T025 [US2] Implement auth/login orchestration service around `auth.py` in `backend/services/auth_service.py`
- [X] T026 [P] [US2] Implement crawl batch orchestration and history persistence in `backend/services/batch_service.py`
- [X] T027 [P] [US2] Implement auth status and login trigger endpoints in `backend/api/auth.py`
- [X] T028 [P] [US2] Implement crawl start and current task endpoints in `backend/api/crawl.py`
- [X] T029 [P] [US2] Implement batch history and batch detail endpoints in `backend/api/batches.py`
- [X] T030 [P] [US2] Extend crawler wrapper to persist articles, summaries, and task events in `backend/services/crawler_service.py`
- [X] T031 [P] [US2] Implement frontend auth and crawl service methods in `frontend/src/services/crawl.ts`
- [X] T032 [P] [US2] Implement history and batch detail service methods in `frontend/src/services/batches.ts`
- [X] T033 [P] [US2] Build crawl workspace page with current task panel in `frontend/src/pages/CrawlPage.tsx`
- [X] T034 [P] [US2] Build task status, progress log, and login status components in `frontend/src/components/TaskStatusPanel.tsx`, `frontend/src/components/TaskEventList.tsx`, and `frontend/src/components/LoginStatusCard.tsx`
- [X] T035 [P] [US2] Build batch history list and article detail viewer in `frontend/src/components/BatchHistoryTable.tsx` and `frontend/src/components/ArticleDetailDrawer.tsx`
- [X] T036 [US2] Connect crawl flow, history refresh, and single-active-task behavior in `frontend/src/stores/appStore.ts`
- [X] T037 [US2] Update main navigation and default landing flow for crawl workspace in `frontend/src/App.tsx`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - 飞书推送 (Priority: P2)

**Goal**: 将当前这一轮中用户选中公众号的爬取结果推送到飞书，并显示明确反馈

**Independent Test**: 完成一轮爬取、配置 Webhook 后点击推送到飞书，飞书收到 interactive 卡片消息，文章标题链接可跳转原文，界面显示推送结果。

### Implementation for User Story 3

- [X] T038 [US3] Implement Feishu push service for current batch scope in `backend/services/feishu_service.py`
- [X] T039 [P] [US3] Implement settings read/update endpoints for webhook and crawl settings in `backend/api/settings.py`
- [X] T040 [P] [US3] Implement batch Feishu push endpoint in `backend/api/feishu.py`
- [X] T041 [P] [US3] Implement frontend settings service methods in `frontend/src/services/settings.ts`
- [X] T042 [P] [US3] Implement frontend Feishu push action service in `frontend/src/services/feishu.ts`
- [X] T043 [P] [US3] Build settings page UI for webhook and crawl parameters in `frontend/src/pages/SettingsPage.tsx`
- [X] T044 [P] [US3] Build Feishu push action component for current batch in `frontend/src/components/FeishuPushPanel.tsx`
- [X] T045 [US3] Connect settings persistence and push feedback flow in `frontend/src/stores/appStore.ts`
- [X] T046 [US3] Add settings and Feishu entry points to application navigation in `frontend/src/App.tsx`

**Checkpoint**: At this point, User Stories 1, 2, and 3 should all work independently

---

## Phase 6: User Story 4 - 源数据看板 (Priority: P2)

**Goal**: 展示公众号数量、文章总数、批次分布、最近爬取时间等源数据统计

**Independent Test**: 在已有历史批次数据的情况下打开看板页面，可以看到关键统计卡片和分布视图；无数据时显示空状态。

### Implementation for User Story 4

- [X] T047 [US4] Implement dashboard aggregation service in `backend/services/dashboard_service.py`
- [X] T048 [P] [US4] Implement dashboard summary endpoint in `backend/api/dashboard.py`
- [X] T049 [P] [US4] Implement frontend dashboard service method in `frontend/src/services/dashboard.ts`
- [X] T050 [P] [US4] Build dashboard page layout in `frontend/src/pages/DashboardPage.tsx`
- [X] T051 [P] [US4] Build summary cards and simple distribution components in `frontend/src/components/DashboardSummaryCards.tsx` and `frontend/src/components/DashboardDistributionPanel.tsx`
- [X] T052 [US4] Connect dashboard loading, empty state, and refresh behavior in `frontend/src/stores/appStore.ts`
- [X] T053 [US4] Add dashboard route and navigation entry in `frontend/src/App.tsx`

**Checkpoint**: At this point, User Stories 1, 2, 3, and 4 should all work independently

---

## Phase 7: User Story 5 - Markdown 下载 (Priority: P3)

**Goal**: 支持单篇文章下载 Markdown，以及多篇文章打包下载 ZIP

**Independent Test**: 从当前批次或历史批次中下载单篇 Markdown 和多篇 ZIP，文件内容包含标题、时间、来源和正文，正文缺失时有明确占位说明。

### Implementation for User Story 5

- [X] T054 [US5] Implement markdown rendering and zip export service in `backend/services/export_service.py`
- [X] T055 [P] [US5] Implement single article markdown download endpoint in `backend/api/exports.py`
- [X] T056 [P] [US5] Implement multi-article zip export endpoint in `backend/api/exports.py`
- [X] T057 [P] [US5] Implement frontend export service methods in `frontend/src/services/exports.ts`
- [X] T058 [P] [US5] Build article export action bar for single and batch export in `frontend/src/components/ArticleExportActions.tsx`
- [X] T059 [US5] Integrate export actions into batch detail and article detail views in `frontend/src/components/BatchHistoryTable.tsx` and `frontend/src/components/ArticleDetailDrawer.tsx`
- [X] T060 [US5] Handle export loading, success, and missing-content fallback in `frontend/src/stores/appStore.ts`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 跨用户故事的收尾、稳定性与交付准备

- [X] T061 [P] Add backend logging for crawl, auth, push, and export flows in `backend/services/`
- [X] T062 [P] Add frontend empty/loading/error state polish across pages in `frontend/src/components/` and `frontend/src/pages/`
- [X] T063 Persist compatibility output for legacy JSON consumers in `backend/services/crawler_service.py`
- [X] T064 Run quickstart flow validation and update `specs/001-frontend-dashboard/quickstart.md`
- [X] T065 Document local run instructions for backend and frontend in `README.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - MVP base
- **User Story 2 (P1)**: Depends on Foundational; reuses US1 account selection but remains independently testable as a crawl/history slice
- **User Story 3 (P2)**: Depends on US2 because Feishu push operates on the current crawl batch
- **User Story 4 (P2)**: Depends on US2 because dashboard statistics come from persisted batches/articles
- **User Story 5 (P3)**: Depends on US2 because markdown export requires persisted article content

### Within Each User Story

- Backend service logic before API endpoint wiring
- API endpoints before frontend service integration
- Frontend services before page/store integration
- Core implementation before cross-page integration

### Parallel Opportunities

- Setup tasks `T003`, `T004`, and `T006` can run in parallel after skeleton creation
- Foundational tasks `T008`, `T009`, `T011`, `T012`, `T014`, and `T015` can run in parallel
- In US1, `T018` through `T022` can be split across backend/frontend in parallel
- In US2, backend endpoint tasks `T027`-`T030` can proceed in parallel with frontend service/UI tasks `T031`-`T035`
- In US3, settings and push UI/backend tasks `T039`-`T044` can run in parallel
- In US4, dashboard endpoint and dashboard UI tasks `T048`-`T051` can run in parallel
- In US5, export endpoint and frontend action tasks `T055`-`T058` can run in parallel

---

## Parallel Example: User Story 2

```bash
# Backend API work in parallel
T027 Implement auth status and login trigger endpoints in backend/api/auth.py
T028 Implement crawl start and current task endpoints in backend/api/crawl.py
T029 Implement batch history and batch detail endpoints in backend/api/batches.py

# Frontend UI work in parallel
T033 Build crawl workspace page in frontend/src/pages/CrawlPage.tsx
T034 Build task status and login status components in frontend/src/components/TaskStatusPanel.tsx and frontend/src/components/LoginStatusCard.tsx
T035 Build batch history and article detail components in frontend/src/components/BatchHistoryTable.tsx and frontend/src/components/ArticleDetailDrawer.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Stop and validate account management independently

### Incremental Delivery

1. Complete Setup + Foundational
2. Deliver User Story 1 as the first usable increment
3. Add User Story 2 to unlock crawl execution and history
4. Add User Story 3 for Feishu push on current batch
5. Add User Story 4 for dashboard insights
6. Add User Story 5 for Markdown/ZIP export
7. Finish with polish and runbook updates

### Parallel Team Strategy

1. One developer handles backend foundation and persistence
2. One developer handles frontend shell and account management
3. After foundation completes:
   - Developer A: crawl/history APIs and orchestration
   - Developer B: crawl/history UI
   - Developer C: settings, dashboard, and export UI/API slices

---

## Notes

- All tasks follow the required checklist format with ID and exact file path
- `[P]` tasks are chosen only where files and dependencies allow parallel work
- User stories are organized for incremental delivery and independent validation
- Suggested MVP scope is User Story 1 only
- `T065` assumes a `README.md` will be added or updated during implementation only if needed for delivery