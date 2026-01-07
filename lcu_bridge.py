import asyncio
import json
from aiohttp import web
from lcu_driver import Connector

# 全局状态
game_state = {
    "isConnected": False,
    "myChampionId": 0,
    "myPickIntentId": 0,
    "enemyIds": [], # 存储敌方 5 个英雄的 ID
    "assignedRole": "UNKNOWN",
    "guideText": "等待游戏连接..."
}

connector = Connector()

# --- Web Server 逻辑 ---
async def handle_get_state(request):
    return web.json_response(game_state, headers={
        "Access-Control-Allow-Origin": "*"
    })

async def start_web_server():
    if getattr(start_web_server, 'has_started', False):
        return
    
    app = web.Application()
    app.router.add_get('/state', handle_get_state)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, 'localhost', 8000)
    await site.start()
    
    print("Web 服务器已启动: http://localhost:8000/state")
    start_web_server.has_started = True

# --- LCU 逻辑 ---

@connector.ready
async def connect(connection):
    game_state["isConnected"] = True
    print('已连接到小助手本身')
    asyncio.create_task(start_web_server())

@connector.close
async def disconnect(connection):
    game_state["isConnected"] = False
    print('客户端与助手连接已断开')

@connector.ws.register('/lol-champ-select/v1/session', event_types=('UPDATE', 'CREATE'))
async def champ_select_handler(connection, event):
    data = event.data
    local_cell_id = data.get('localPlayerCellId')
    
    # 1. 同步己方数据
    for team_member in data.get('myTeam', []):
        if team_member['cellId'] == local_cell_id:
            game_state["myChampionId"] = team_member.get('championId', 0)
            game_state["myPickIntentId"] = team_member.get('championPickIntent', 0)
            game_state["assignedRole"] = team_member.get('assignedPosition', 'UNKNOWN')
            break
    
    # 2. 同步敌方数据 (新增部分)
    # 提取敌方所有英雄 ID，如果是 0 表示还没选
    enemy_list = data.get('theirTeam', [])
    current_enemies = []
    
    for enemy in enemy_list:
        # 在选人阶段，championId 代表已锁定，championPickIntent 代表预选
        # 通常我们只关心已锁定的敌人
        cid = enemy.get('championId', 0)
        current_enemies.append(cid)
    
    # 更新到全局状态
    game_state["enemyIds"] = current_enemies
    
    # 打印调试信息 (可选)
    # print(f"当前状态 -> 我方ID: {game_state['myChampionId']} | 敌方ID列表: {current_enemies}")

# --- 启动入口 ---
if __name__ == "__main__":
    try:
        connector.start()
    except KeyboardInterrupt:
        print("停止运行")
