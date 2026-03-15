# Data Model: 微信公众号前端管理看板

## 1. 公众号（Account）

### Fields
- `id`: 主键
- `name`: 公众号名称，必填，唯一
- `fakeid`: 微信平台唯一标识，可为空，首次成功抓取后补全
- `is_selected`: 是否默认选中
- `created_at`: 创建时间
- `updated_at`: 更新时间

### Validation Rules
- `name` 不能为空
- `name` 在系统内必须唯一

### Relationships
- 一个公众号可关联多个爬取批次中的文章记录

## 2. 系统设置（Settings）

### Fields
- `id`: 主键
- `feishu_webhook`: 飞书 Webhook 地址，可为空
- `article_count`: 每次每个公众号抓取的文章数
- `request_interval`: 请求间隔（秒）
- `login_status`: 当前登录状态（未登录 / 登录中 / 已登录 / 失效）
- `last_login_at`: 最近登录成功时间，可为空
- `updated_at`: 更新时间

### Validation Rules
- `article_count` 必须为正整数
- `request_interval` 必须为非负数
- `feishu_webhook` 允许为空；非空时需满足 URL 格式

## 3. 爬取任务（Crawl Task / Batch）

### Fields
- `id`: 主键
- `batch_no`: 面向用户展示的批次号
- `status`: `waiting` / `running` / `completed` / `failed`
- `selected_account_ids`: 本轮选中的公众号列表
- `started_at`: 开始时间
- `finished_at`: 结束时间，可为空
- `total_accounts`: 本轮公众号总数
- `completed_accounts`: 已完成公众号数
- `total_articles`: 本轮抓取文章总数
- `error_message`: 失败信息，可为空
- `feishu_push_status`: `not_pushed` / `success` / `failed`
- `feishu_pushed_at`: 推送完成时间，可为空

### Validation Rules
- 任一时刻最多仅允许一条 `status=running` 的任务
- `completed_accounts` 不得大于 `total_accounts`
- `finished_at` 仅在任务结束后存在

### State Transitions
- `waiting -> running`
- `running -> completed`
- `running -> failed`

## 4. 文章（Article）

### Fields
- `id`: 主键
- `batch_id`: 所属爬取批次
- `account_id`: 来源公众号
- `title`: 文章标题
- `url`: 原文链接
- `digest`: 文章摘要，可为空
- `summary`: AI 摘要，可为空
- `content`: 正文内容，可为空
- `cover_url`: 封面图地址，可为空
- `publish_time`: 发布时间
- `article_aid`: 微信文章标识，可为空
- `created_at`: 入库时间

### Validation Rules
- `title` 必填
- `url` 建议唯一，至少在同一批次中不重复
- `content` 允许为空，但为空时导出内容需标记正文获取失败

### Relationships
- 多篇文章属于一个爬取批次
- 多篇文章来源于一个公众号

## 5. 任务事件 / 进度日志（Task Event）

### Fields
- `id`: 主键
- `batch_id`: 所属任务
- `level`: `info` / `warning` / `error`
- `message`: 进度或错误信息
- `created_at`: 记录时间

### Purpose
- 用于前端展示当前轮次的实时进度和历史任务日志
- 支撑“正在处理哪个公众号”“是否需要重新登录”等状态反馈

## Relationships Summary
- `Account 1:N Article`
- `Crawl Task 1:N Article`
- `Crawl Task 1:N Task Event`
- `Settings` 为单实例配置实体

## Derived Views for Dashboard
- 公众号总数
- 历史批次数
- 文章总数
- 最近一次成功爬取时间
- 各公众号文章数分布
- 各批次状态分布