# 微信公众平台配置
#
# COOKIE/TOKEN 留空（默认）= 自动弹出浏览器扫码登录（推荐）
# COOKIE/TOKEN 填入值     = 手动模式，不弹浏览器
#
# 手动获取方式：
# 1. 浏览器登录 https://mp.weixin.qq.com
# 2. 进入"素材管理" → "新建图文" → 点击工具栏"超链接" → "查找文章"
# 3. F12 打开开发者工具 → Network 面板
# 4. 搜索任意公众号名称，找到 searchbiz 或 appmsg 请求
# 5. 从请求头中复制 cookie，从 URL 参数中复制 token

COOKIE = ""  # 留空 = 自动登录（推荐），填入值 = 手动模式
TOKEN = ""   # 留空 = 自动登录（推荐），填入值 = 手动模式（纯数字）

# 目标公众号列表
ACCOUNTS = [
    "群响刘老板",
    "梁狗蛋",
    "人神共奋",
]

# 每个公众号抓取的文章数量
ARTICLE_COUNT = 10

# 请求间隔（秒），避免触发反爬
REQUEST_INTERVAL = 4

# Kimi (Moonshot AI) 配置（留空 = 跳过 AI 摘要）
# 获取方式：https://platform.moonshot.cn → API 密钥
KIMI_API_KEY = "sk-5qGMX6lg5cFRqgdi6kZkXDvyAfMoBkbjtxAa2Wmc3mV3WZyG"
KIMI_MODEL = "kimi-k2-0905-preview"  # 可选：moonshot-v1-8k / moonshot-v1-32k / moonshot-v1-128k
KIMI_REQUEST_INTERVAL = 2   # 请求间隔（秒）

# 飞书推送配置（留空 = 不推送）
# 获取方式：飞书群 → 设置 → 群机器人 → 添加机器人 → 自定义机器人 → 复制 Webhook 地址
FEISHU_WEBHOOK = ""
