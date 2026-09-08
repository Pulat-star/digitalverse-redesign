# DIGITALVERSE — scrollytelling qayta dizayn

`digitalverse.uz` saytining qayta dizayni. Kontent va brend ranglari asl saytdan
olingan, taqdimot esa **scrollytelling** — sahifa pastga aylantirilgani sari
hikoya bosqichma-bosqich ochiladi.

## Ishga tushirish

Ikki rejim bor.

**1. Faqat sayt (statik).** Hech narsa o'rnatish shart emas — GitHub Pages
aynan shunday ishlaydi:

```bash
cd digitalverse-redesign
python3 -m http.server 8080     # → http://localhost:8080
```

**2. Sayt + admin panel + CRM.** Node kerak:

```bash
npm install
npm start                       # → http://localhost:3000
                                #   admin: http://localhost:3000/admin/
```

Birinchi kirishda admin akkaunti so'raladi (parol kamida 8 belgi).

## Admin panel

`/admin/` manzilida, uch bo'lim:

- **Matnlar** — saytdagi 62 ta matn maydoni. O'zgartirilganlari qizil nuqta
  bilan belgilanadi, «asliga» tugmasi bitta maydonni qaytaradi.
- **Portfolio** — ishlar qo'shish, rasm yuklash, tartibni o'zgartirish,
  yashirish. Saytdagi «Наши работы» bloki shu yerdan to'ladi.
- **CRM** — saytdagi formadan kelgan arizalar. Holat (yangi → ish jarayonida →
  muvaffaqiyatli / yo'qotilgan), izoh, CSV eksport. Telefon raqami bosiladigan.

`/admin/#crm` kabi havolalar to'g'ridan-to'g'ri kerakli bo'limni ochadi.

### Matn tahrirlash qanday ishlaydi

Asl matn **`index.html` ichida qoladi** — bazada faqat o'zgartirishlar
saqlanadi. Har bir tahrirlanadigan element `data-cms="kalit"` atributiga ega;
server ishga tushganda aynan shu HTML'dan asl qiymatlarni o'qiydi
(`readDefaults()`), admin formasi esa `server.js` dagi `CONTENT_META`
ro'yxatidan yorliqlarni oladi.

Buning ikkita amaliy natijasi bor:
1. Baza bo'sh bo'lsa yoki server umuman bo'lmasa (GitHub Pages) — sayt
   dizaynerdagi asl matn bilan chiqadi, hech narsa buzilmaydi.
2. Yangi maydon qo'shish uchun HTML'ga atribut va `CONTENT_META` ga bitta
   qator qo'shiladi, xolos.

## API

| Usul | Yo'l | Kim uchun |
|---|---|---|
| GET | `/api/content` | ochiq — faqat o'zgartirishlar |
| GET | `/api/portfolio` | ochiq — chop etilgan ishlar |
| POST | `/api/leads` | ochiq — formadan ariza |
| GET/PUT | `/api/admin/content` | admin |
| CRUD | `/api/admin/portfolio` | admin |
| GET/PATCH/DELETE | `/api/admin/leads` | admin |
| GET | `/api/admin/leads.csv` | admin — Excel uchun BOM bilan |

## Hosting

Baza va yuklangan rasmlar `STORAGE_DIR` ichida saqlanadi (`data/`, `uploads/`).
Railway kabi platformada bu o'zgaruvchini doimiy volume'ga yo'naltiring, aks
holda har deploy'da ma'lumot yo'qoladi. Ishlab chiqarishda `NODE_ENV=production`
qo'ying — shunda cookie `secure` bo'ladi va proxy ishonchli deb belgilanadi.

## Fayl tuzilishi

```
index.html            — butun sahifa
server.js             — Express server, API, admin va CRM
admin/                — boshqaruv paneli (index.html, admin.css, admin.js)
assets/css/style.css  — dizayn tizimi va barcha bo'limlar
assets/js/main.js     — scroll dvigateli (kutubxonasiz, vanilla JS)
assets/js/cms.js      — admin matnlarini qo'llaydi, formani CRM'ga yuboradi
assets/logos/         — mijozlar logotiplari (asl saytdan)
assets/img/           — logo belgisi
data/, uploads/       — baza va yuklangan rasmlar (git'ga tushmaydi)
```

## Ranglar (asl saytdan saqlangan)

| Token | Qiymat | Qayerda |
|---|---|---|
| `--red` | `#EC3237` | asosiy brend rangi |
| `--red-hi` | `#EE5155` | hover |
| `--black` / `--ink` | `#000000` / `#08080A` | fon |
| `--white` | `#FFFFFF` | matn |
| `--grey` / `--grey-2` | `#666666` / `#9A9AA3` | ikkinchi darajali matn |
| `--green` | `#16A34A` | natija/foyda raqamlari |
| `--blush` | `#FEF1F1` | FAQ bo'limi foni |
| `--smoke` | `#FBFCFC` | "Nam doveryayut" bo'limi foni |

Shriftlar uch rolda: sarlavhalar — **Unbounded** (asl Benzin o'rniga, u bepul
emas; hero'da yengil 300 og'irlikda, bo'limlarda qalin), matn — **Manrope**,
yorliqlar/indekslar/raqamli ko'rsatkichlar — **JetBrains Mono**. Mono bu yerda
bezak emas: u "ma'lumot" registrini bildiradi.

## Scrollytelling ssenariysi

| # | Bo'lim | Scroll effekti |
|---|---|---|
| 1 | Hero | **3D zarrachali miya** — logotip konturidan yig'ilgan yorug' maydon; sarlavha satrma-satr ko'tariladi |
| 2 | Точка А | sticky pin; 5 ta muammo navbat bilan yonadi va qizil chiziq bilan o'chiriladi |
| 3 | Ekosistema | pinned gorizontal scroll — panellar 3D `rotateY` bilan chetga buriladi |
| 4 | Faktlar | raqamlar 0 dan sanaladi (150+, 30+, 97%) |
| 5 | Portfolio | bento grid, raqamlar sanaladi |
| 6 | Keyslar | chapda sticky ROI ekrani; o'ngdagi keys almashganda ROI va foyda qayta sanaladi |
| 7 | SMM | 3 blok reveal |
| 8 | Mijozlar | ikki qatorli qarama-qarshi marquee |
| 9 | FAQ | akkordeon |
| 10 | Ariza + footer | forma, kontaktlar |

O'ngdagi nuqtalar — bob indikatori; tepadagi chiziq — scroll progressi.

## Muhim texnik jihatlar

- **Kutubxona yo'q.** Barcha scroll effektlari bitta `requestAnimationFrame`
  siklida hisoblanadi; faqat `transform`/`opacity` o'zgaradi.
- **Responsive to'rt qatlam:**
  `≤1199px` tor desktop · `≤1023px` planshet · `≤767px` telefon · `≤420px` kichik telefon.
  Bundan tashqari `(hover:none)` uchun alohida qoidalar (tegish nishonlari ≥44px,
  hover-transformlar o'chadi) va yotiq telefon uchun `(max-height:560px)` qoidasi.
  **1024px chizig'i muhim:** aynan shu yerda pinned bo'limlar oddiy oqimga o'tadi va
  bu chegara `main.js` dagi `mqDesktop` bilan bir xil bo'lishi shart — aks holda CSS
  va scroll dvigateli bir-biriga zid ishlaydi.
- Planshetda ekosistema bir ustun emas, **ikki ustunli grid** (beshinchi panel to'liq enni oladi).
- **`prefers-reduced-motion`:** barcha animatsiyalar o'chadi, kontent to'liq ko'rinadi.
- **Hero canvas** hero ekrandan chiqqanda `IntersectionObserver` orqali to'xtaydi.
- **3D miya** logotipning o'zidan olingan: `assets/img/logo-mark.png` masofaviy
  transformatsiya bilan 25 ta doira + 27 ta bog'lanishga ajratilgan (`BRAIN_N` / `BRAIN_E`).
  O'sha graf ikki joyda ishlatiladi — sarlavhadagi SVG logotip va hero'dagi zarrachali sahna.
  Zarrachalar tasodifiy emas: belgi doiralari va tayoqchalari **birlashmasining konturi**
  hisoblanadi (`inside()` rad etish testi), so'ng linza shaklida z bo'yicha cho'ziladi —
  shuning uchun oldindan qaraganda aynan logotip o'qiladi. Renderer — Canvas 2D,
  additiv aralashtirish (chuqurlik bo'yicha saralash kerak emas), oldindan tayyorlangan
  sprite'lar. Sichqoncha yaqinlashganda zarrachalar chetga suriladi va prujina bilan qaytadi.
- **Kartochkalar** `data-tilt` bilan sichqoncha ostida 3D buriladi (faqat `pointer:fine`).

## Hali ulanmagan narsalar

- **Forma** server bilan ishlaganda arizani CRM'ga yozadi; serversiz (GitHub Pages)
  faqat "yuborildi" holatini ko'rsatadi.
- **Ijtimoiy tarmoq havolalari** footerda `#` — haqiqiy URL'lar bilan almashtirish kerak.
- **"Подробнее" / "Смотреть портфолио"** tugmalari hozir arizaga olib boradi;
  alohida sahifalar bo'lsa, ular havolaga ulanadi.
- Asl saytdagi **Блог** bo'limi bu redizaynda yo'q — kerak bo'lsa qo'shiladi.
