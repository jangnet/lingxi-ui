"""重新生成 media/ 下的占位图（产品截图、案例图、团队头像、二维码、favicon）。
用法：python3 scripts/placeholders.py
替换成真实素材后不需要再跑。"""
from pathlib import Path
R=Path(__file__).resolve().parent.parent/'media'
labels={'content-overview':'内容总览','content-qa':'审核与定稿','content-wiki':'交付物整理','knowledge-ask':'有据问答','knowledge-wiki':'Wiki 知识页','knowledge-graph':'知识图谱'}
for n,t in labels.items():
    rows=''.join(f'<rect x="250" y="{120+i*54}" width="{560-i*60}" height="22" rx="6" fill="#e3e8e2"/>' for i in range(6))
    side=''.join(f'<rect x="24" y="{76+i*40}" width="{120-i*8}" height="12" rx="4" fill="#cfd8d0"/>' for i in range(7))
    (R/'product'/f'{n}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 600" font-family="Noto Sans SC,sans-serif"><rect width="960" height="600" fill="#f3f5f2"/><rect width="210" height="600" fill="#eef2ed"/><rect x="24" y="28" width="110" height="14" rx="4" fill="#1a6b3a"/>{side}<rect x="250" y="40" width="300" height="30" rx="6" fill="#fff"/><text x="262" y="62" font-size="18" font-weight="700" fill="#141414">{t}</text><text x="900" y="60" text-anchor="end" font-size="13" fill="#6b6b6b">示例界面 · 占位图</text>{rows}<rect x="250" y="460" width="660" height="110" rx="12" fill="#fff" stroke="#e3e8e2"/><text x="270" y="500" font-size="15" fill="#3d3d3d">这里放你产品的真实截图（建议 1600×1000，webp）。</text><text x="270" y="530" font-size="13" fill="#6b6b6b">占位图由 scripts/placeholders.py 生成。</text></svg>',encoding='utf-8')
cases=['制造企业知识库搭建','内容工作流试点','品牌官网重构','长尾搜索可见度','团队 AI 实操培训','发布影片概念样片']
cols=[('#dfe9e2','#1a6b3a'),('#e6e3f0','#4b4a8a'),('#e9e4dc','#7a5a2f'),('#dde8ec','#2a5d6b'),('#eae6dd','#6b5a2a'),('#e2e2e2','#333')]
for i,(t,(bg,fg)) in enumerate(zip(cases,cols)):
    (R/'cases'/f'case-0{i+1}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" font-family="Noto Sans SC,sans-serif"><rect width="800" height="500" fill="{bg}"/><circle cx="640" cy="140" r="90" fill="{fg}" opacity=".12"/><circle cx="700" cy="380" r="140" fill="{fg}" opacity=".08"/><text x="40" y="420" font-size="34" font-weight="700" fill="{fg}">{t}</text><text x="40" y="460" font-size="18" fill="{fg}" opacity=".7">案例 0{i+1} · 示例占位图</text></svg>',encoding='utf-8')
for i,n in enumerate(['林知远','沈若云','顾青','陆小舟']):
    (R/f'team-0{i+1}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" font-family="Noto Serif SC,serif"><rect width="200" height="200" fill="#e8f1ea"/><circle cx="100" cy="80" r="38" fill="#9fb3a6"/><path d="M30 190c10-50 40-70 70-70s60 20 70 70z" fill="#9fb3a6"/><text x="100" y="188" text-anchor="middle" font-size="22" font-weight="700" fill="#1a6b3a">{n[0]}</text></svg>',encoding='utf-8')
(R/'qr-placeholder.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><rect width="180" height="180" fill="#fff" stroke="#d8d8d6"/>'+''.join(f'<rect x="{12+(i%9)*18}" y="{12+(i//9)*18}" width="14" height="14" fill="#141414"/>' for i in range(81) if (i*7+i//9*3)%5<2)+'<rect x="55" y="75" width="70" height="30" fill="#fff"/><text x="90" y="95" text-anchor="middle" font-size="12" font-family="sans-serif" fill="#6b6b6b">二维码占位</text></svg>',encoding='utf-8')
(R/'favicon.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#1a6b3a"/><path d="M8 16c3-5 8-5 11 0s8 5 11 0" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" transform="translate(-3 0)"/></svg>',encoding='utf-8')
print('ok')
