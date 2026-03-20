# Tasks
- [x] Task 1: 梳理现有导出链路并确定 DOCX 接入点
  - [x] SubTask 1.1: 识别前端导出入口与参数结构
  - [x] SubTask 1.2: 识别后端导出接口与格式白名单
  - [x] SubTask 1.3: 确认文件命名与错误处理复用策略

- [x] Task 2: 实现 DOCX 下载能力
  - [x] SubTask 2.1: 在前端新增 DOCX 选项并接入请求
  - [x] SubTask 2.2: 在后端新增或扩展 DOCX 生成逻辑
  - [x] SubTask 2.3: 返回正确 MIME 类型与下载头

- [x] Task 3: 补充验证与回归
  - [x] SubTask 3.1: 增加 DOCX 成功下载验证
  - [x] SubTask 3.2: 增加异常输入与失败路径验证
  - [x] SubTask 3.3: 回归现有导出格式不受影响

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
