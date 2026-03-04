# 微信公众号文章爬取 - 实施方案

## 目标
爬取3个公众号（群响刘老板、梁狗蛋、人神共奋）的最新10条文章，包含正文内容，输出JSON。

## 技术方案：微信公众平台后台API

### 原理
利用微信公众号后台"素材管理→超链接→查找文章"的接口，可以搜索并获取任意公众号的文章列表。

### 前置步骤（手动操作一次，有效期约2小时）
1. 浏览器登录 https://mp.weixin.qq.com
2. 进入"素材管理" → "新建图文" → 点击上方工具栏的"超链接" → "查找文章"
3. 打开 F12 开发者工具 → Network
4. 在查找框搜索任意公众号名称
5. 找到 `appmsg` 或 `searchbiz` 请求，从中提取 `cookie` 和 `token`

### 项目结构
```
news_fetch/
├── config.py          # cookie/token 配置（手动填入）
├── fetcher.py         # 核心爬虫：搜索公众号 + 获取文章列表
├── parser.py          # 文章正文解析器
├── main.py            # 入口：串联爬取流程
├── output/            # 输出目录
└── requirements.txt   # 依赖
```

### 实现步骤

#### Step 1: 项目初始化
- 创建项目结构
- `requirements.txt`: requests, beautifulsoup4, lxml
- `config.py`: 存放 cookie, token, 目标公众号列表

#### Step 2: fetcher.py - 核心爬虫
1. `search_account(name)` — 通过公众号名称搜索，获取 fakeid
   - 接口: `GET /cgi-bin/searchbiz`
   - 参数: action=search_biz, query=公众号名, token, begin=0, count=5
2. `get_articles(fakeid, count=10)` — 获取文章列表
   - 接口: `GET /cgi-bin/appmsg`
   - 参数: action=list_ex, fakeid, type=9, begin=0, count=10, token
   - 返回: 文章标题、链接、摘要、封面图、发布时间

#### Step 3: parser.py - 正文解析
- 请求文章永久链接
- 用 BeautifulSoup 解析 `<div id="js_content">` 提取正文
- 清理 HTML 标签，保留纯文本

#### Step 4: main.py - 主流程
- 读取配置中的3个公众号名称
- 依次搜索获取 fakeid → 获取文章列表 → 解析正文
- 每次请求间隔3-5秒（避免触发反爬）
- 将结果保存为 `output/articles.json`

#### Step 5: 输出格式
```json
{
  "fetch_time": "2026-03-03T22:30:00",
  "accounts": [
    {
      "name": "群响刘老板",
      "fakeid": "xxx",
      "articles": [
        {
          "title": "文章标题",
          "url": "永久链接",
          "digest": "摘要",
          "cover": "封面图URL",
          "publish_time": "2026-03-01",
          "content": "正文纯文本..."
        }
      ]
    }
  ]
}
```

### 注意事项
- cookie/token 有效期约2小时，过期需重新获取
- 请求频率控制在 3-5秒/次，避免封号
- 正文抓取需要注意微信的防盗链机制（图片可能无法直接访问）
