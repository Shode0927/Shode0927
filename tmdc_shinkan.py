from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.platypus import HRFlowable
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.lib.styles import ParagraphStyle

pdfmetrics.registerFont(UnicodeCIDFont('HeiseiKakuGo-W5'))
pdfmetrics.registerFont(UnicodeCIDFont('HeiseiMin-W3'))

FONT = 'HeiseiKakuGo-W5'
FONT_MIN = 'HeiseiMin-W3'

doc = SimpleDocTemplate(
    '/home/user/Shode0927/TMDC新歓イベント一覧.pdf',
    pagesize=A4,
    rightMargin=15*mm, leftMargin=15*mm,
    topMargin=15*mm, bottomMargin=15*mm,
)

title_style = ParagraphStyle('title', fontName=FONT, fontSize=16, leading=22,
                              alignment=1, textColor=colors.HexColor('#003366'))
subtitle_style = ParagraphStyle('subtitle', fontName=FONT, fontSize=10, leading=14,
                                 alignment=1, textColor=colors.grey)
section_style = ParagraphStyle('section', fontName=FONT, fontSize=12, leading=16,
                                textColor=colors.HexColor('#003366'), spaceBefore=8)
note_style = ParagraphStyle('note', fontName=FONT, fontSize=8, leading=12,
                              textColor=colors.grey)

story = []

story.append(Paragraph('TMDC（筑波大学マリンダイビングクラブ）', subtitle_style))
story.append(Paragraph('新歓イベント一覧', title_style))
story.append(Paragraph('ブログ調査期間：2007年〜2023年', subtitle_style))
story.append(Spacer(1, 6*mm))
story.append(HRFlowable(width='100%', thickness=2, color=colors.HexColor('#003366')))
story.append(Spacer(1, 4*mm))

# --- Total events table ---
story.append(Paragraph('■ 実施確認された新歓イベント（総まとめ）', section_style))
story.append(Spacer(1, 2*mm))

header = ['#', 'イベント名', '実施年度']
rows = [
    ['1', '新歓祭でのビラ配り（大学主催イベント参加）', '毎年'],
    ['2', '宿舎へのビラ貼り・ポスティング（一の矢・平砂宿舎）', '毎年'],
    ['3', '練習見学・体験（プールでフィン・マスク着用体験）', '毎年'],
    ['4', '食事会（フラガ、北方園、ステーキガスト等\n※新入生の食費は先輩持ち）', '毎年'],
    ['5', 'お花見', '2010・2011年'],
    ['6', 'BIGパフェ / パフェパーティー（ウエストハウス等）', '2010・2011・2015・2016年'],
    ['7', 'BBQ（ふれあいの里等）', '2010〜2014年'],
    ['8', 'お好み焼き食べ放題（ひらり）', '2011・2013年'],
    ['9', '鍋パーティー（先輩宅）', '2011〜2014・2016年'],
    ['10', 'クレープパーティー', '2011・2012年'],
    ['11', 'ピザ＆パスタ食べ放題', '2012年'],
    ['12', 'パスタパーティー', '2013・2014年'],
    ['13', 'パンケーキイベント（にんにくっ亭）', '2014年'],
    ['14', 'しゃぶしゃぶ（しゃぶ菜）', '2015年'],
    ['15', '中華・とんかつ・インドカレー等への外食', '複数年'],
    ['16', '大洗水族館（アクアワールド大洗）遠足', '2015・2016年'],
    ['17', 'お台場海上公園清掃\n（ウェットスーツで参加・初ダイビング体験兼用）', '毎年6月頃'],
    ['18', 'お台場観光（ビーナスフォート、レトロゲーセン等）', '2010・2016年等'],
    ['19', 'お台場ジョイポリス（お化け屋敷等）', '2016年'],
    ['20', 'プリクラ撮影（お台場・イーアス等）', '2010・2016年等'],
    ['21', '本新歓（飲み会1〜3次会）\n（OB・OG・顧問の吉田先生も参加、自己紹介タイムあり）', '毎年6月頃'],
    ['22', 'ウェットスーツ採寸・機材説明会（パワーズ訪問）', '複数年'],
    ['23', '合宿写真・動画の上映会（食事会でパソコン・テレビで上映）', '複数年'],
    ['24', '先輩宅での宅飲み・映画鑑賞・ゲーム', '2013年等'],
    ['25', 'SNS広報（新歓専用Twitter・Instagram運用）', '2023年〜'],
]

cell_style = ParagraphStyle('cell', fontName=FONT, fontSize=8, leading=11)
header_style = ParagraphStyle('header', fontName=FONT, fontSize=9, leading=12,
                               textColor=colors.white)

table_data = [[Paragraph(h, header_style) for h in header]]
for row in rows:
    table_data.append([Paragraph(str(row[0]), cell_style),
                        Paragraph(row[1], cell_style),
                        Paragraph(row[2], cell_style)])

col_widths = [10*mm, 110*mm, 42*mm]
t = Table(table_data, colWidths=col_widths, repeatRows=1)
t.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#003366')),
    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    ('ALIGN', (0,0), (0,-1), 'CENTER'),
    ('ALIGN', (1,0), (1,-1), 'LEFT'),
    ('ALIGN', (2,0), (2,-1), 'CENTER'),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('FONTNAME', (0,0), (-1,-1), FONT),
    ('FONTSIZE', (0,1), (-1,-1), 8),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#f0f4f8'), colors.white]),
    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#aaaaaa')),
    ('TOPPADDING', (0,0), (-1,-1), 3),
    ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ('LEFTPADDING', (0,0), (-1,-1), 4),
    ('RIGHTPADDING', (0,0), (-1,-1), 4),
]))
story.append(t)
story.append(Spacer(1, 6*mm))
story.append(HRFlowable(width='100%', thickness=1, color=colors.HexColor('#aaaaaa')))
story.append(Spacer(1, 3*mm))

# --- Annual notes ---
story.append(Paragraph('■ 年度別スケジュールの特徴', section_style))
story.append(Spacer(1, 2*mm))

notes = [
    ['時期', '内容'],
    ['4〜5月', '毎週2〜3回のペースで練習見学＋食事会・各種テーマイベントを開催'],
    ['6月', '「お台場清掃→観光→本新歓（飲み会）」が定番の締めイベント'],
    ['集合場所', '平砂・一の矢宿舎の共用棟前（TMDC看板持参の部員が待機）'],
    ['最大規模年', '2011年度（4月中に約10種類のイベントを実施）'],
    ['費用', '新入生の食費・参加費は全て先輩の奢りが慣習'],
]

note_header_style = ParagraphStyle('nh', fontName=FONT, fontSize=9, leading=12, textColor=colors.white)
note_cell_style = ParagraphStyle('nc', fontName=FONT, fontSize=9, leading=13)

note_data = [[Paragraph(notes[0][0], note_header_style), Paragraph(notes[0][1], note_header_style)]]
for row in notes[1:]:
    note_data.append([Paragraph(row[0], note_cell_style), Paragraph(row[1], note_cell_style)])

nt = Table(note_data, colWidths=[30*mm, 132*mm], repeatRows=1)
nt.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#336699')),
    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    ('FONTNAME', (0,0), (-1,-1), FONT),
    ('FONTSIZE', (0,0), (-1,-1), 9),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#eef2f7'), colors.white]),
    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#aaaaaa')),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('TOPPADDING', (0,0), (-1,-1), 4),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ('LEFTPADDING', (0,0), (-1,-1), 6),
]))
story.append(nt)
story.append(Spacer(1, 4*mm))

story.append(Paragraph(
    '※ お台場清掃は海洋環境保護ボランティアと新入生の「初ダイビング体験」を兼ねた毎年恒例の目玉イベント。',
    note_style))
story.append(Paragraph(
    '※ 新歓カテゴリ記事数：59件超（2007年4月〜2023年4月）',
    note_style))

doc.build(story)
print('PDF生成完了')
