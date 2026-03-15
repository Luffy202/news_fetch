"""遗留 CLI 飞书推送兼容层。"""

from backend import runtime_config
from backend.services.feishu_service import push_accounts


def notify(result):
    webhook = runtime_config.FEISHU_WEBHOOK
    if not webhook:
        return

    accounts = result.get('accounts', [])
    if not accounts:
        print('没有爬取到文章，跳过飞书推送')
        return

    try:
        push_accounts(webhook, accounts)
        print('飞书推送成功')
    except Exception as exc:
        print(f'飞书推送失败: {exc}')
