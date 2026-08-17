"""Generate a parser-compatible WMU timetable stress-test PDF."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "WMU课表-高强度导入测试.pdf"
FONT_REGULAR = Path(r"C:\Windows\Fonts\msyh.ttc")
FONT_BOLD = Path(r"C:\Windows\Fonts\msyhbd.ttc")

PAGE_WIDTH, PAGE_HEIGHT = landscape(A4)
GRID_LEFT = 27 * mm
GRID_RIGHT = PAGE_WIDTH - 6 * mm
GRID_TOP = PAGE_HEIGHT - 22 * mm
GRID_BOTTOM = 13 * mm
HEADER_HEIGHT = 11 * mm
COLUMN_WIDTH = (GRID_RIGHT - GRID_LEFT) / 7

DAYS = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"]
MARKERS = {
    "自主学习": "□",
    "在线": "▲",
    "讲课": "◆",
    "实验": "◇",
    "讨论": "●",
    "实践": "#",
}

SOURCES = [
    ("温州医科大学官网", "https://www.wmu.edu.cn/"),
    ("温州医科大学校园位置", "https://www.wmu.edu.cn/xqzl/xywz.htm"),
    ("温州医科大学基础医学院", "https://jcyxy.wmu.edu.cn/"),
    ("基础医学院教师队伍", "https://jcyxy.wmu.edu.cn/szdw/jsdw.htm"),
    ("基础医学院专业介绍", "https://jcyxy.wmu.edu.cn/jyjx/zyjs.htm"),
]


def event(
    day,
    title,
    activity,
    periods,
    weeks,
    campus,
    room,
    teacher,
    code,
    credit=2.0,
    assessment="考试",
    note="合成测试数据",
):
    return {
        "day": day,
        "title": title,
        "activity": activity,
        "periods": periods,
        "weeks": weeks,
        "campus": campus,
        "room": room,
        "teacher": teacher,
        "class_name": f"{code}-测试班",
        "class_group": "26基础医学1班,26临床医学2班",
        "assessment": assessment,
        "note": note,
        "hours": "讲课32,实验8,在线4",
        "weekly_hours": 2.5,
        "total_hours": 40,
        "credit": credit,
    }


PAGE_ONE = [
    event(1, "基础医学导论", "讲课", "1-2", "1-16周", "茶山校区", "6A101（智慧教室）", "薛向阳", "NN260001-120001-1", 2.5),
    event(1, "医学统计学", "实验", "3-4", "1-2周,4-12周(双),13-17周(单)", "滨海校区", "6114计算机机房", "张丽芳", "NN260002-120002-1", 2.5),
    event(2, "生物化学与分子生物学", "讲课", "3-5", "1-16周", "茶山校区", "7CJ305", "潘志方", "NN260003-120003-1", 3.5),
    event(2, "医学人工智能基础与临床决策支持系统", "在线", "8-10", "1-16周", "线上", "超星在线教学平台", "孙鹏", "NN260004-120004-1", 2.0),
    event(3, "系统解剖学", "讲课", "1-2", "1-16周", "学院路校区", "教学楼 A101（智慧教室）", "郑飞中", "NN260005-120005-1", 3.0),
    event(3, "局部解剖学开放性实验与临床技能整合训练", "实验", "11-13", "2-16周(双)", "茶山校区", "4B3楼生化实验室7", "黄宝兴", "NN260006-120006-1", 2.0),
    event(4, "组织学与胚胎学", "讲课", "3-4", "1-16周", "滨海校区", "2101", "杨新东", "NN260007-120007-1", 2.5),
    event(4, "医学伦理学案例研讨", "讨论", "14-15", "3-15周(单)", "学院路校区", "眼视光教学楼10-B203", "许益笑", "NN260008-120008-1", 1.5, "考查"),
    event(5, "生理学", "讲课", "1-3", "1-16周", "茶山校区", "6B203 （智慧教室）", "郑绿珍", "NN260009-120009-1", 3.5),
    event(5, "机能实验学", "实验", "14-16", "1-16周", "滨海校区", "2222", "金可可", "NN260010-120010-1", 2.0),
    event(6, "科研方法与文献检索", "自主学习", "6-7", "8周", "茶山校区", "7A212会议室", "郭益民", "NN260011-120011-1", 1.0, "考查"),
    event(6, "大学生创新训练项目实践", "实践", "17-19", "5-17周(单)", "滨海校区", "求知楼6114计算机机房", "梁韶晖", "NN260012-120012-1", 1.0, "考查"),
    event(7, "形势与政策", "在线", "8-10", "4周,8周,12周,16周", "线上", "在线学习", "袁琳波", "NN260013-120013-1", 0.5, "考查"),
    event(7, "基础医学前沿讲座", "讲课", "14-16", "1-16周", "茶山校区", "生物医药科研楼二楼学术报告厅", "陈然", "NN260014-120014-1", 1.0, "考查"),
]

PAGE_TWO = [
    event(1, "病理生理学", "讲课", "7", "1-16周", "滨海校区", "1102", "王志斌", "NN260015-120015-1", 3.0),
    event(1, "临床思维与循证医学", "讨论", "8", "1-16周", "茶山校区", "A101东区", "刘凤英", "NN260016-120016-1", 1.5, "考查", "第7节13:20结束后切换校区边界"),
    event(2, "细胞生物学", "讲课", "8", "1-16周", "茶山校区", "6A101东区", "蒋朋飞", "NN260017-120017-1", 2.5),
    event(2, "医学遗传学", "讲课", "8", "1-16周", "滨海校区", "10-B203", "孙鹏", "NN260018-120018-1", 2.5, note="故意制造跨校区同钟点冲突"),
    event(3, "人体寄生虫学", "讲课", "9-10", "1-8周", "滨海校区", "6114", "张丽芳、杨新东", "NN260019-120019-1", 2.0),
    event(3, "人体寄生虫学", "实验", "11-12", "9-16周", "茶山校区", "7A207", "张丽芳、杨新东", "NN260019-120019-2", 2.0),
    event(4, "医学微生物学", "讲课", "5", "1-16周", "滨海校区", "2101东侧", "郑绿珍", "NN260020-120020-1", 2.5),
    event(4, "医学微生物学", "实验", "7", "1-16周", "茶山校区", "6A101（智慧教室）", "郑绿珍", "NN260020-120020-2", 2.5),
    event(5, "病理学", "讲课", "10-11", "1-16周", "学院路校区", "教学楼 A101（智慧教室）", "薛向阳、潘志方、蒋朋飞", "NN260021-120021-1", 3.5),
    event(5, "分子医学综合实践", "实践", "12-13", "2-16周(双)", "茶山校区", "4B3楼生化实验室7", "潘志方", "NN260022-120022-1", 1.5, "考查"),
    event(6, "医学英语学术写作", "自主学习", "1", "1-16周", "学院路校区", "A座-报告厅（北）", "许益笑", "NN260023-120023-1", 1.5, "考查"),
    event(6, "创新创业基础", "讨论", "2", "1-16周", "茶山校区", "7A212会议室", "袁琳波", "NN260024-120024-1", 1.0, "考查"),
    event(7, "习近平新时代中国特色社会主义思想概论", "讲课", "3-5", "1-16周", "滨海校区", "2222", "陈然", "NN260025-120025-1", 3.0),
    event(7, "医学人文专题：医患沟通、叙事医学与健康传播", "在线", "6-7", "1-16周", "线上", "学习通-同步课堂", "刘凤英", "NN260026-120026-1", 2.0, "考查"),
]


def register_fonts():
    pdfmetrics.registerFont(TTFont("WMU-Regular", str(FONT_REGULAR)))
    pdfmetrics.registerFont(TTFont("WMU-Bold", str(FONT_BOLD)))


def split_text(text, max_width, font_name, font_size):
    lines = []
    current = ""
    for char in str(text):
        candidate = current + char
        if current and pdfmetrics.stringWidth(candidate, font_name, font_size) > max_width:
            lines.append(current)
            current = char
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines or [""]


def event_payload(item):
    marker = MARKERS[item["activity"]]
    detail = (
        f'{marker}({item["periods"]}节){item["weeks"]}'
        f'/校区:{item["campus"]}'
        f'/场地:{item["room"]}'
        f'/教师:{item["teacher"]}'
        f'/教学班:{item["class_name"]}'
        f'/教学班组成:{item["class_group"]}'
        f'/考核方式:{item["assessment"]}'
        f'/选课备注:{item["note"]}'
        f'/课程学时组成:{item["hours"]}'
        f'/周学时:{item["weekly_hours"]}'
        f'/总学时:{item["total_hours"]}'
    )
    return detail


def draw_identity(c, page_number, page_label):
    c.setFillColor(colors.HexColor("#1f2937"))
    c.setFont("WMU-Bold", 12)
    c.drawString(5 * mm, PAGE_HEIGHT - 8 * mm, "边界测试课表")
    c.setFont("WMU-Regular", 6.5)
    c.drawString(5 * mm, PAGE_HEIGHT - 12 * mm, "2026-2027学年第1学期")
    c.drawString(5 * mm, PAGE_HEIGHT - 16 * mm, "学号: TEST2600001")
    c.setFillColor(colors.HexColor("#b42318"))
    c.setFont("WMU-Bold", 6.2)
    c.drawString(5 * mm, PAGE_HEIGHT - 20 * mm, "合成测试数据 / 非真实排课")
    c.setFillColor(colors.HexColor("#64748b"))
    c.setFont("WMU-Regular", 5.8)
    c.drawString(5 * mm, PAGE_HEIGHT - 23.5 * mm, f"{page_label} | {page_number}/3")


def draw_schedule_page(c, events, page_number, page_label):
    draw_identity(c, page_number, page_label)
    grid_height = GRID_TOP - GRID_BOTTOM
    c.setStrokeColor(colors.HexColor("#94a3b8"))
    c.setLineWidth(0.55)
    c.setFillColor(colors.HexColor("#f1f5f9"))
    c.rect(GRID_LEFT, GRID_TOP - HEADER_HEIGHT, GRID_RIGHT - GRID_LEFT, HEADER_HEIGHT, fill=1, stroke=1)

    for index, day in enumerate(DAYS):
        x = GRID_LEFT + index * COLUMN_WIDTH
        if index:
            c.line(x, GRID_BOTTOM, x, GRID_TOP)
        c.setFillColor(colors.HexColor("#334155"))
        c.setFont("WMU-Bold", 8.2)
        c.drawCentredString(x + COLUMN_WIDTH / 2, GRID_TOP - 7.3 * mm, day)
    c.rect(GRID_LEFT, GRID_BOTTOM, GRID_RIGHT - GRID_LEFT, grid_height, fill=0, stroke=1)

    body_top = GRID_TOP - HEADER_HEIGHT
    body_height = body_top - GRID_BOTTOM
    by_day = {day: [item for item in events if item["day"] == day] for day in range(1, 8)}

    for day in range(1, 8):
        items = by_day[day]
        if not items:
            continue
        x = GRID_LEFT + (day - 1) * COLUMN_WIDTH
        card_gap = 2.2 * mm
        card_height = (body_height - card_gap * (len(items) + 1)) / len(items)
        for position, item in enumerate(items):
            card_y = body_top - card_gap - (position + 1) * card_height - position * card_gap
            card_x = x + 1.4 * mm
            card_width = COLUMN_WIDTH - 2.8 * mm
            fill = colors.HexColor("#ffffff") if position % 2 == 0 else colors.HexColor("#f8fafc")
            c.setFillColor(fill)
            c.setStrokeColor(colors.HexColor("#cbd5e1"))
            c.roundRect(card_x, card_y, card_width, card_height, 2.2 * mm, fill=1, stroke=1)

            text_x = card_x + 2.1 * mm
            max_text_width = card_width - 4.2 * mm
            title_size = 6.7
            detail_size = 5.25
            title_leading = 8.1
            detail_leading = 6.45
            cursor_y = card_y + card_height - 4.2 * mm

            c.setFillColor(colors.HexColor("#0f172a"))
            c.setFont("WMU-Bold", title_size)
            for line in split_text(item["title"], max_text_width, "WMU-Bold", title_size):
                c.drawString(text_x, cursor_y, line)
                cursor_y -= title_leading

            cursor_y -= 1.2
            c.setFillColor(colors.HexColor("#334155"))
            c.setFont("WMU-Regular", detail_size)
            for line in split_text(event_payload(item), max_text_width, "WMU-Regular", detail_size):
                if cursor_y < card_y + 2.4 * mm:
                    raise RuntimeError(f'课程块文字溢出: {item["title"]}')
                c.drawString(text_x, cursor_y, line)
                cursor_y -= detail_leading
            if cursor_y < card_y + 2.4 * mm:
                raise RuntimeError(f'课程块学分字段溢出: {item["title"]}')
            c.drawString(text_x, cursor_y, f'/学分:{item["credit"]}')

    c.setFillColor(colors.HexColor("#64748b"))
    c.setFont("WMU-Regular", 5.8)
    c.drawString(5 * mm, 8 * mm, "解析与布局压力测试")
    c.setFillColor(colors.HexColor("#b42318"))
    c.drawString(5 * mm, 5 * mm, "非真实排课")
    c.showPage()


def draw_notes_page(c):
    draw_identity(c, 3, "测试矩阵与来源")
    left = 18 * mm
    right = PAGE_WIDTH - 18 * mm
    top = PAGE_HEIGHT - 30 * mm

    c.setFillColor(colors.HexColor("#0f172a"))
    c.setFont("WMU-Bold", 17)
    c.drawString(left, top, "高强度测试矩阵")
    c.setFillColor(colors.HexColor("#475569"))
    c.setFont("WMU-Regular", 8)
    c.drawString(left, top - 7 * mm, "该文件用于暴露解析、布局、冲突检测和地点后处理问题；人物与排课组合均为合成测试。")

    data = [
        ["类别", "覆盖内容", "预期结果"],
        ["地点短码", "6A101、6B203、7CJ305、2101、2222、1102、6114、A101", "图标独占行；4-6位字母数字教室号单独居中"],
        ["地点说明", "6A101东区、7A212会议室、2101东侧", "短码结束后强制换行，说明进入下一行"],
        ["自由换行", "10-B203、4B3楼生化实验室7、长报告厅名称", "不套用短码规则，按等宽文本框自然换行"],
        ["后处理", "智慧教室、计算机机房、学院路原文、非前缀短码", "茶山/滨海按规则清理；学院路与未识别格式保留"],
        ["时间边界", "滨海第7节13:05-13:20，三校区第8节13:30开始", "周一第7/8节不误报冲突"],
        ["故意冲突", "周二茶山第8节与滨海第8节，周次完全重叠", "应报告1组跨校区时间冲突"],
        ["周次语法", "单周、双周、多区间、单周次、1-16周", "全部解析且不产生缺失周次警告"],
        ["活动类型", "自主学习、在线、讲课、实验、讨论、实践", "六种标记全部识别"],
        ["极端文本", "超长课程名、多教师、长教学班组成与备注", "不重叠、不越界，卡片可滚动"],
        ["晚间兼容", "第17-19节实践课", "验证现有晚间扩展时段兼容性"],
    ]
    table = Table(data, colWidths=[28 * mm, 92 * mm, 125 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "WMU-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "WMU-Regular"),
        ("FONTSIZE", (0, 0), (-1, 0), 7.2),
        ("FONTSIZE", (0, 1), (-1, -1), 6.5),
        ("LEADING", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#334155")),
        ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f8fafc")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#ffffff"), colors.HexColor("#f8fafc")]),
        ("GRID", (0, 0), (-1, -1), 0.45, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    table_width, table_height = table.wrapOn(c, right - left, 120 * mm)
    table.drawOn(c, left, top - 13 * mm - table_height)

    source_y = top - 20 * mm - table_height
    c.setFillColor(colors.HexColor("#0f172a"))
    c.setFont("WMU-Bold", 10)
    c.drawString(left, source_y, "公开资料来源")
    c.setFont("WMU-Regular", 6.3)
    c.setFillColor(colors.HexColor("#475569"))
    source_y -= 5 * mm
    for label, url in SOURCES:
        c.drawString(left, source_y, f"{label}: {url}")
        source_y -= 4.2 * mm

    c.setFillColor(colors.HexColor("#b42318"))
    c.setFont("WMU-Bold", 7.2)
    c.drawString(left, 12 * mm, "声明：课程名参考公开专业方向与常见医学课程命名；教师名和地点名取自公开页面；所有排课关系均为合成测试。")
    c.showPage()


def build_pdf():
    register_fonts()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT), pagesize=landscape(A4), pageCompression=1)
    c.setTitle("WMU课表高强度导入测试")
    c.setAuthor("WMU Class Schedule Test Fixture")
    c.setSubject("Synthetic timetable parser and layout stress test")
    draw_schedule_page(c, PAGE_ONE, 1, "核心格式")
    draw_schedule_page(c, PAGE_TWO, 2, "边界与冲突")
    draw_notes_page(c)
    c.save()
    print(OUTPUT)


if __name__ == "__main__":
    build_pdf()
