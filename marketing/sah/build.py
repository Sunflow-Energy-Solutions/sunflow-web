#!/usr/bin/env python3
"""Builds the bilingual (EN / VI) Support at Home fact sheets as PDFs.

Usage: python3 build.py            -> writes output/*.pdf (needs headless Chromium)
Edit CONFIG for contact details, and swap assets/logo.svg for the official logo.
"""
import html, pathlib, subprocess, sys

HERE = pathlib.Path(__file__).parent
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"

CONFIG = {
    "phone": "",      # e.g. "1300 000 000" - hidden from footer while empty
    "website": "",    # e.g. "integralagedcare.com.au"
    "version": "001",
    "date": "October 2026",
    "funding_date": "1 July 2026",
}

# Funding figures: health.gov.au, current as of 1 July 2026 (indexed each 1 July).
HCP = [("1", "2,818.04", "11,272.15"), ("2", "4,955.44", "19,821.76"),
       ("3", "10,787.18", "43,148.74"), ("4", "16,353.98", "65,415.91")]
SAH = [("1", "2,752.50", "11,010.01"), ("2", "4,112.84", "16,451.35"),
       ("3", "5,634.20", "22,536.81"), ("4", "7,617.13", "30,468.51"),
       ("5", "10,182.38", "40,729.53"), ("6", "12,341.32", "49,365.27"),
       ("7", "14,915.00", "59,660.00"), ("8", "20,034.28", "80,137.12")]

T = {
 "en": {
  "lang": "en", "file": "SAH-Inclusions-and-Exclusions-EN.pdf",
  "tag": "Support at Home",
  "title": "Inclusions &amp; exclusions guide",
  "subtitle": "What your Support at Home funding can &ndash; and can&rsquo;t &ndash; be used for.",
  "inc_h": "What&rsquo;s included",
  "inc_p": "Support at Home funding is broad. It&rsquo;s designed to help you stay healthy, connected and independent in your own home. Here&rsquo;s what it can cover:",
  "inc": [
   ("Personal care", "Help with bathing, showering, dressing, grooming, continence and getting around safely."),
   ("Everyday living", "Cleaning, laundry, gardening and meal preparation, plus transport to shops, medical appointments and social outings."),
   ("Clinical care", "Nursing for wound care, medication management and other clinical needs, and allied health such as physiotherapy, occupational therapy, speech pathology and podiatry."),
   ("Social support", "Social activities and community connection that reduce loneliness and support your mental wellbeing."),
   ("Care management", "A care plan built around your goals and preferences, with services coordinated and your budget kept on track."),
   ("Assistive technology &amp; home modifications", "Equipment such as walking frames and shower chairs, and changes to your home, funded separately through the AT-HM Scheme."),
  ],
  "exc_h": "What&rsquo;s not included",
  "exc_p": "Some costs sit outside the program so that funding stays focused on your care and support:",
  "exc": [
   ("Accommodation", "Rent or mortgage payments."),
   ("General living expenses", "Groceries, clothing, utility bills, pet care and professional cleaning services."),
   ("Medicare-covered health services", "GP visits, medical tests and hospital treatment."),
   ("Medication", "Prescription and over-the-counter medicines, generally covered by the PBS."),
   ("Other insurances", "Health, home or car insurance costs."),
   ("Gambling &amp; entertainment", "Gambling, or purely recreational items such as holidays."),
  ],
  "check_h": "Not sure if something is covered?",
  "check_p": "Ask yourself these three questions, then talk to us before you book:",
  "check": ["Does it support a goal in my care plan?", "Is it already covered by Medicare, the PBS or another scheme?", "Is it an everyday living cost I&rsquo;d pay anyway?"],
  "flex_h": "Choice and flexibility",
  "flex_p": "Support at Home puts you in the driver&rsquo;s seat. You can shape your plan around your own needs and preferences &ndash; within the rules of the program. Depending on your circumstances, you may also be asked to contribute towards the cost of some services.",
  "fund_h": "Support at Home funding levels",
  "fund_p": "There are eight Support at Home classifications, each matched to a different level of care need. People who were already on a Home Care Package (HCP) keep their level as a transitioned classification.",
  "hcp_h": "Transitioned HCP levels", "sah_h": "Support at Home classifications",
  "col_hcp": "HCP level", "col_sah": "Classification", "col_q": "Quarterly budget", "col_a": "Annual amount",
  "hcp_row": "Transitioned HCP Level ", "hcp_short": "Level ",
  "fund_note": "Current as of {d}. Funding amounts are indexed on 1 July each year. Source: health.gov.au. Always check the latest figures at health.gov.au or myagedcare.gov.au.",
  "manual": "For detailed rules and scenarios, refer to the Support at Home Program Manual, which sets out the inclusions, exclusions and provider responsibilities.",
  "partner": "Integral Aged Care Management is working in partnership with Trilogy Care to help you access Support at Home services.",
  "ver": "Version {v} &middot; {d}",
  "page": "Page {n} of {t}",
  "bilingual": "Also available in Vietnamese / C&oacute; phi&ecirc;n b&#7843;n ti&#7871;ng Vi&#7879;t",
 },
 "vi": {
  "lang": "vi", "file": "SAH-Inclusions-and-Exclusions-VI.pdf",
  "tag": "Support at Home &ndash; H&#7895; tr&#7907; t&#7841;i nh&agrave;",
  "title": "C&aacute;c kho&#7843;n &#273;&#432;&#7907;c v&agrave; kh&ocirc;ng &#273;&#432;&#7907;c chi tr&#7843;",
  "subtitle": "Ngu&#7891;n kinh ph&iacute; Support at Home c&oacute; th&#7875; &ndash; v&agrave; kh&ocirc;ng th&#7875; &ndash; d&ugrave;ng v&agrave;o nh&#7919;ng vi&#7879;c g&igrave;.",
  "inc_h": "C&aacute;c kho&#7843;n &#273;&#432;&#7907;c chi tr&#7843;",
  "inc_p": "Kinh ph&iacute; Support at Home bao qu&aacute;t nhi&#7873;u lo&#7841;i h&#7895; tr&#7907;, gi&uacute;p b&#7841;n gi&#7919; g&igrave;n s&#7913;c kh&#7887;e, duy tr&igrave; k&#7871;t n&#7889;i v&agrave; s&#7889;ng &#7897;c l&#7853;p ngay t&#7841;i nh&agrave;. C&aacute;c kho&#7843;n c&oacute; th&#7875; &#273;&#432;&#7907;c chi tr&#7843; g&#7891;m:",
  "inc": [
   ("Ch&#259;m s&oacute;c c&aacute; nh&acirc;n", "H&#7895; tr&#7907; t&#7855;m r&#7917;a, m&#7863;c qu&#7847;n &aacute;o, v&#7879; sinh c&aacute; nh&acirc;n, ki&#7875;m so&aacute;t ti&#7875;u ti&#7879;n v&agrave; di chuy&#7875;n an to&agrave;n."),
   ("Sinh ho&#7841;t h&#7857;ng ng&agrave;y", "D&#7885;n d&#7865;p nh&agrave; c&#7917;a, gi&#7863;t gi&#361;, l&agrave;m v&#432;&#7901;n, chu&#7849;n b&#7883; b&#7919;a &#259;n; &#273;&#432;a &#273;&oacute;n &#273;i mua s&#7855;m, kh&aacute;m b&#7879;nh ho&#7863;c sinh ho&#7841;t x&atilde; h&#7897;i."),
   ("Ch&#259;m s&oacute;c y t&#7871;", "D&#7883;ch v&#7909; &#273;i&#7873;u d&#432;&#7905;ng nh&#432; ch&#259;m s&oacute;c v&#7871;t th&#432;&#417;ng, qu&#7843;n l&yacute; thu&#7889;c v&agrave; c&aacute;c nhu c&#7847;u y t&#7871; kh&aacute;c; c&aacute;c d&#7883;ch v&#7909; y t&#7871; li&ecirc;n quan (allied health) nh&#432; v&#7853;t l&yacute; tr&#7883; li&#7879;u, ho&#7841;t &#273;&#7897;ng tr&#7883; li&#7879;u, ng&ocirc;n ng&#7919; tr&#7883; li&#7879;u v&agrave; ch&#259;m s&oacute;c b&agrave;n ch&acirc;n."),
   ("H&#7895; tr&#7907; x&atilde; h&#7897;i", "C&aacute;c ho&#7841;t &#273;&#7897;ng x&atilde; h&#7897;i v&agrave; k&#7871;t n&#7889;i c&#7897;ng &#273;&#7891;ng, gi&uacute;p gi&#7843;m c&ocirc; &#273;&#417;n v&agrave; n&acirc;ng cao s&#7913;c kh&#7887;e tinh th&#7847;n."),
   ("Qu&#7843;n l&yacute; ch&#259;m s&oacute;c", "X&acirc;y d&#7921;ng k&#7871; ho&#7841;ch ch&#259;m s&oacute;c theo m&#7909;c ti&ecirc;u v&agrave; mong mu&#7889;n c&#7911;a b&#7841;n, &#273;i&#7873;u ph&#7889;i d&#7883;ch v&#7909; v&agrave; theo d&otilde;i ng&acirc;n s&aacute;ch."),
   ("C&ocirc;ng ngh&#7879; h&#7895; tr&#7907; &amp; s&#7917;a &#273;&#7893;i nh&agrave; &#7903; (AT-HM)", "Thi&#7871;t b&#7883; nh&#432; khung t&#7853;p &#273;i, gh&#7871; t&#7855;m v&agrave; c&aacute;c h&#7841;ng m&#7909;c s&#7917;a &#273;&#7893;i nh&agrave; &#7903;, &#273;&#432;&#7907;c t&agrave;i tr&#7907; ri&ecirc;ng qua Ch&#432;&#417;ng tr&igrave;nh AT-HM."),
  ],
  "exc_h": "C&aacute;c kho&#7843;n kh&ocirc;ng &#273;&#432;&#7907;c chi tr&#7843;",
  "exc_p": "M&#7897;t s&#7889; chi ph&iacute; n&#7857;m ngo&agrave;i ch&#432;&#417;ng tr&igrave;nh &#273;&#7875; ngu&#7891;n kinh ph&iacute; t&#7853;p trung v&agrave;o vi&#7879;c ch&#259;m s&oacute;c v&agrave; h&#7895; tr&#7907; b&#7841;n:",
  "exc": [
   ("Chi ph&iacute; ch&#7893; &#7903;", "Ti&#7873;n thu&ecirc; nh&agrave; ho&#7863;c tr&#7843; g&oacute;p nh&agrave;."),
   ("Chi ti&ecirc;u sinh ho&#7841;t chung", "Th&#7921;c ph&#7849;m, qu&#7847;n &aacute;o, h&oacute;a &#273;&#417;n &#273;i&#7879;n n&#432;&#7899;c, ch&#259;m s&oacute;c th&uacute; c&#432;ng v&agrave; d&#7883;ch v&#7909; d&#7885;n d&#7865;p chuy&ecirc;n nghi&#7879;p."),
   ("D&#7883;ch v&#7909; y t&#7871; do Medicare chi tr&#7843;", "Kh&aacute;m b&aacute;c s&#297; gia &#273;&igrave;nh (GP), x&eacute;t nghi&#7879;m y khoa v&agrave; &#273;i&#7873;u tr&#7883; t&#7841;i b&#7879;nh vi&#7879;n."),
   ("Thu&#7889;c men", "Thu&#7889;c k&ecirc; toa v&agrave; thu&#7889;c kh&ocirc;ng k&ecirc; toa, th&#432;&#7901;ng &#273;&#432;&#7907;c PBS chi tr&#7843;."),
   ("C&aacute;c lo&#7841;i b&#7843;o hi&#7875;m kh&aacute;c", "Chi ph&iacute; b&#7843;o hi&#7875;m s&#7913;c kh&#7887;e, nh&agrave; &#7903; ho&#7863;c xe."),
   ("C&#7901; b&#7841;c &amp; gi&#7843;i tr&iacute;", "C&#7901; b&#7841;c, ho&#7863;c c&aacute;c kho&#7843;n thu&#7847;n t&uacute;y gi&#7843;i tr&iacute; nh&#432; &#273;i du l&#7883;ch ngh&#7881; d&#432;&#7905;ng."),
  ],
  "check_h": "Kh&ocirc;ng ch&#7855;c m&#7897;t kho&#7843;n c&oacute; &#273;&#432;&#7907;c chi tr&#7843; kh&ocirc;ng?",
  "check_p": "H&atilde;y t&#7921; h&#7887;i ba c&acirc;u d&#432;&#7899;i &#273;&acirc;y, r&#7891;i li&ecirc;n h&#7879; v&#7899;i ch&uacute;ng t&ocirc;i tr&#432;&#7899;c khi &#273;&#7863;t d&#7883;ch v&#7909;:",
  "check": ["Kho&#7843;n n&agrave;y c&oacute; h&#7895; tr&#7907; m&#7909;c ti&ecirc;u n&agrave;o trong k&#7871; ho&#7841;ch ch&#259;m s&oacute;c c&#7911;a t&ocirc;i kh&ocirc;ng?", "Kho&#7843;n n&agrave;y &#273;&atilde; &#273;&#432;&#7907;c Medicare, PBS ho&#7863;c ch&#432;&#417;ng tr&igrave;nh kh&aacute;c chi tr&#7843; ch&#432;a?", "&#272;&acirc;y c&oacute; ph&#7843;i chi ph&iacute; sinh ho&#7841;t h&#7857;ng ng&agrave;y m&agrave; t&ocirc;i v&#7851;n ph&#7843;i t&#7921; tr&#7843; kh&ocirc;ng?"],
  "flex_h": "Quy&#7873;n l&#7921;a ch&#7885;n v&agrave; s&#7921; linh ho&#7841;t",
  "flex_p": "Support at Home trao cho b&#7841;n quy&#7873;n ch&#7911; &#273;&#7897;ng. B&#7841;n c&oacute; th&#7875; &#273;i&#7873;u ch&#7881;nh k&#7871; ho&#7841;ch theo nhu c&#7847;u v&agrave; s&#7903; th&iacute;ch ri&ecirc;ng, trong khu&ocirc;n kh&#7893; quy &#273;&#7883;nh c&#7911;a ch&#432;&#417;ng tr&igrave;nh. T&ugrave;y ho&agrave;n c&#7843;nh, b&#7841;n c&oacute; th&#7875; &#273;&#432;&#7907;c y&ecirc;u c&#7847;u &#273;&oacute;ng g&oacute;p m&#7897;t ph&#7847;n chi ph&iacute; cho m&#7897;t s&#7889; d&#7883;ch v&#7909;.",
  "fund_h": "C&aacute;c m&#7913;c kinh ph&iacute; Support at Home",
  "fund_p": "C&oacute; t&aacute;m m&#7913;c ph&acirc;n lo&#7841;i Support at Home, m&#7895;i m&#7913;c t&#432;&#417;ng &#7913;ng v&#7899;i m&#7897;t m&#7913;c nhu c&#7847;u ch&#259;m s&oacute;c kh&aacute;c nhau. Ng&#432;&#7901;i &#273;ang d&ugrave;ng G&oacute;i Ch&#259;m s&oacute;c T&#7841;i nh&agrave; (HCP) s&#7869; &#273;&#432;&#7907;c gi&#7919; m&#7913;c c&#361; theo ph&acirc;n lo&#7841;i chuy&#7875;n ti&#7871;p.",
  "hcp_h": "C&aacute;c m&#7913;c HCP chuy&#7875;n ti&#7871;p", "sah_h": "Ph&acirc;n lo&#7841;i Support at Home",
  "col_hcp": "M&#7913;c HCP", "col_sah": "Ph&acirc;n lo&#7841;i", "col_q": "Ng&acirc;n s&aacute;ch h&#7857;ng qu&yacute;", "col_a": "S&#7889; ti&#7873;n h&#7857;ng n&#259;m",
  "hcp_row": "HCP chuy&#7875;n ti&#7871;p m&#7913;c ", "hcp_short": "M&#7913;c ",
  "fund_note": "C&#7853;p nh&#7853;t &#273;&#7871;n ng&agrave;y {d}. M&#7913;c kinh ph&iacute; &#273;&#432;&#7907;c &#273;i&#7873;u ch&#7881;nh theo ch&#7881; s&#7889; v&agrave;o ng&agrave;y 1 th&aacute;ng 7 h&#7857;ng n&#259;m. Ngu&#7891;n: health.gov.au. Vui l&ograve;ng ki&#7875;m tra s&#7889; li&#7879;u m&#7899;i nh&#7845;t t&#7841;i health.gov.au ho&#7863;c myagedcare.gov.au.",
  "manual": "&#272;&#7875; bi&#7871;t quy &#273;&#7883;nh chi ti&#7871;t v&agrave; c&aacute;c t&igrave;nh hu&#7889;ng c&#7909; th&#7875;, vui l&ograve;ng tham kh&#7843;o S&#7893; tay Ho&#7841;t &#273;&#7897;ng Ch&#432;&#417;ng tr&igrave;nh Support at Home, trong &#273;&oacute; n&ecirc;u r&otilde; c&aacute;c kho&#7843;n &#273;&#432;&#7907;c chi tr&#7843;, kh&ocirc;ng &#273;&#432;&#7907;c chi tr&#7843; v&agrave; tr&aacute;ch nhi&#7879;m c&#7911;a nh&agrave; cung c&#7845;p.",
  "partner": "Integral Aged Care Management h&#7907;p t&aacute;c c&ugrave;ng Trilogy Care &#273;&#7875; gi&uacute;p b&#7841;n ti&#7871;p c&#7853;n c&aacute;c d&#7883;ch v&#7909; Support at Home.",
  "ver": "Phi&ecirc;n b&#7843;n {v} &middot; {d}",
  "page": "Trang {n}/{t}",
  "bilingual": "Also available in English / C&oacute; phi&ecirc;n b&#7843;n ti&#7871;ng Anh",
 },
}
DATES = {"en": "October 2026", "vi": "Th&aacute;ng 10/2026"}
FUND_DATES = {"en": "1 July 2026", "vi": "01/07/2026"}

CSS = """
@page { size: A4; margin: 0 }
:root { --navy:#163D70; --teal:#3F9A97; --teal-l:#68B9B6; --gold:#68B9B6; --ink:#243447; --mute:#5B6B7B; --tint:#F2F7F8; --rule:#D9E3E8; --coral:#B5524C; --coral-tint:#FBF3F2; }
* { box-sizing:border-box; margin:0; padding:0 }
body { font-family:'Liberation Sans','DejaVu Sans',Arial,sans-serif; color:var(--ink); font-size:10.2pt; line-height:1.45; -webkit-print-color-adjust:exact; print-color-adjust:exact }
.page { width:210mm; height:297mm; position:relative; overflow:hidden; page-break-after:always; background:#fff }
.page:last-child { page-break-after:auto }
.hdr { background:#fff; color:var(--navy); padding:9mm 15mm 7mm; position:relative }
.hdr::after { content:''; position:absolute; left:0; right:0; bottom:0; height:2.2mm; background:linear-gradient(90deg,var(--navy) 0 60%,var(--teal-l) 60% 100%) }
.hdr .logo { height:24mm; display:block; margin-bottom:5mm }
.hdr .tag { font-size:9pt; letter-spacing:.14em; text-transform:uppercase; color:var(--teal); font-weight:700; margin-bottom:1.5mm }
.hdr h1 { font-size:21pt; line-height:1.15; font-weight:700 }
.hdr p.sub { margin-top:2mm; font-size:11pt; color:var(--mute) }
.mini { background:#fff; color:var(--navy); padding:6mm 15mm; display:flex; justify-content:space-between; align-items:center; position:relative }
.mini::after { content:''; position:absolute; left:0; right:0; bottom:0; height:1.6mm; background:linear-gradient(90deg,var(--navy) 0 60%,var(--teal-l) 60% 100%) }
.mini .logo { height:13mm }
.mini .t { font-size:9pt; color:var(--teal); font-weight:700; letter-spacing:.05em }
.body { padding:6mm 15mm 0 }
h2 { font-size:15pt; color:var(--navy); margin-bottom:1.5mm; display:flex; align-items:center; gap:2.5mm }
h2 .dot { width:7mm; height:7mm; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; color:#fff; font-size:11pt; font-weight:700; flex:none }
.dot.ok { background:var(--teal) } .dot.no { background:var(--coral) }
p.lead { color:var(--mute); margin-bottom:3mm; font-size:9.6pt }
.grid { display:grid; grid-template-columns:1fr 1fr; gap:3mm }
.grid.no { grid-template-columns:1fr 1fr 1fr }
.card { border:.3mm solid var(--rule); border-left:1.4mm solid var(--teal); border-radius:1.5mm; padding:2.4mm 3.6mm; background:var(--tint); break-inside:avoid }
.card h3 { font-size:10.4pt; color:var(--navy); margin-bottom:.8mm }
.card p { font-size:9.2pt; line-height:1.38 }
.card .n { color:var(--teal); font-weight:700; margin-right:1.5mm }
.grid.no .card { border-left-color:var(--coral); background:var(--coral-tint) }
.grid.no .card .n { color:var(--coral) }
.callout { margin-top:5mm; border:.3mm solid var(--teal-l); background:#EFF8F8; border-radius:1.5mm; padding:4mm 5mm }
.callout h3 { color:var(--navy); font-size:11.5pt; margin-bottom:1mm }
.callout ul { margin:1.5mm 0 0 4.5mm } .callout li { margin-bottom:.8mm }
.flex { margin-top:5mm; padding:4.5mm 5.5mm; background:var(--navy); color:#fff; border-radius:1.5mm }
.flex h2 { color:#fff; font-size:13pt } .flex p { color:#E3EEF6 }
.tables { display:grid; grid-template-columns:1fr 1fr; gap:6mm; margin-top:4mm; align-items:start }
.tables h3 { font-size:11pt; color:var(--navy); margin-bottom:2mm }
table { width:100%; border-collapse:collapse; font-size:9pt }
th { background:var(--navy); color:#fff; text-align:left; padding:2.2mm 2mm; font-weight:700; line-height:1.2 }
td { padding:2.2mm 2mm; border-bottom:.3mm solid var(--rule) }
tr:nth-child(even) td { background:var(--tint) }
td.num, th.num { text-align:right; white-space:nowrap }
td.lv { font-weight:700; color:var(--navy) }
.note { margin-top:5mm; font-size:8.8pt; color:var(--mute) }
.manual { margin-top:4mm; padding:3.5mm 5mm; border-left:1.4mm solid var(--teal-l); background:var(--tint); font-size:9.6pt }
.ftr { position:absolute; left:0; right:0; bottom:0; padding:0 15mm 7mm }
.ftr .partner { border-top:.3mm solid var(--rule); padding-top:3mm; font-size:9pt; color:var(--ink) }
.ftr .row { display:flex; justify-content:space-between; margin-top:2mm; font-size:8pt; color:var(--mute) }
"""

def logo(cls):
    import base64
    data = base64.b64encode((HERE / "assets" / "logo.png").read_bytes()).decode()
    return f'<img class="{cls}" src="data:image/png;base64,{data}" alt="Integral Aged Care Management">'

def cards(items, cls=""):
    out = "".join(f'<div class="card"><h3><span class="n">{i}.</span>{h}</h3><p>{p}</p></div>' for i, (h, p) in enumerate(items, 1))
    return f'<div class="grid {cls}">{out}</div>'

def table(rows, t, kind):
    c1 = t["col_hcp"] if kind == "hcp" else t["col_sah"]
    body = ""
    for lv, q, a in rows:
        label = (t["hcp_short"] if kind == "hcp" else "") + lv
        body += f'<tr><td class="lv">{label}</td><td class="num">${q}</td><td class="num">${a}</td></tr>'
    return f'<table><tr><th>{c1}</th><th class="num">{t["col_q"]}</th><th class="num">{t["col_a"]}</th></tr>{body}</table>'

def footer(t, n, total, v, d):
    contact = " &middot; ".join(x for x in (CONFIG["phone"], CONFIG["website"]) if x)
    left = contact or t["ver"].format(v=v, d=d)
    right = t["page"].format(n=n, t=total) + ("" if not contact else " &middot; " + t["ver"].format(v=v, d=d))
    return f'<div class="ftr"><div class="partner">{t["partner"]}</div><div class="row"><span>{left}</span><span>{right}</span></div></div>'

def render(code):
    t = T[code]; v = CONFIG["version"]; d = DATES[code]; fd = FUND_DATES[code]
    p1 = f'''<div class="page"><div class="hdr">{logo("logo")}<div class="tag">{t["tag"]}</div><h1>{t["title"]}</h1><p class="sub">{t["subtitle"]}</p></div>
<div class="body"><h2><span class="dot ok">&#10003;</span>{t["inc_h"]}</h2><p class="lead">{t["inc_p"]}</p>{cards(t["inc"])}
<h2 style="margin-top:5mm"><span class="dot no">&times;</span>{t["exc_h"]}</h2><p class="lead">{t["exc_p"]}</p>{cards(t["exc"],"no")}</div>{footer(t,1,2,v,d)}</div>'''
    p2 = f'''<div class="page"><div class="mini">{logo("logo")}<span class="t">{t["tag"]}</span></div>
<div class="body"><h2><span class="dot ok">$</span>{t["fund_h"]}</h2><p class="lead">{t["fund_p"]}</p>
<div class="tables"><div><h3>{t["hcp_h"]}</h3>{table(HCP,t,"hcp")}</div><div><h3>{t["sah_h"]}</h3>{table(SAH,t,"sah")}</div></div>
<p class="note">{t["fund_note"].format(d=fd)}</p>
<div class="callout"><h3>{t["check_h"]}</h3><p>{t["check_p"]}</p><ul>{"".join(f"<li>{c}</li>" for c in t["check"])}</ul></div>
<div class="flex"><h2>{t["flex_h"]}</h2><p>{t["flex_p"]}</p></div>
<div class="manual">{t["manual"]}</div></div>{footer(t,2,2,v,d)}</div>'''
    return f'<!doctype html><html lang="{t["lang"]}"><head><meta charset="utf-8"><title>{html.unescape(t["title"])}</title><style>{CSS}</style></head><body>{p1}{p2}</body></html>'

if __name__ == "__main__":
    out = HERE / "output"; out.mkdir(exist_ok=True)
    for code, t in T.items():
        src = out / f"_{code}.html"; src.write_text(render(code), encoding="utf-8")
        subprocess.run([CHROME, "--headless", "--no-sandbox", "--disable-gpu", "--no-pdf-header-footer",
                        f"--print-to-pdf={out / t['file']}", src.as_uri()], check=True, capture_output=True)
        src.unlink(); print("wrote", out / t["file"])
