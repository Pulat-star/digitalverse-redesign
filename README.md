# DIGITALVERSE — scrollytelling qayta dizayn

`digitalverse.uz` saytining qayta dizayni. Kontent va brend ranglari asl saytdan
olingan, taqdimot esa **scrollytelling** — sahifa pastga aylantirilgani sari
hikoya bosqichma-bosqich ochiladi.

## Ishga tushirish

Ikki rejim bor.

**1. Faqat sayt (statik).** Hech narsa o'rnatish shart emas — GitHub Pages
aynan shunday ishlaydi:

```bash
python3 -m http.server 8080     # → http://localhost:8080
```

**2. Sayt + admin panel + CRM** (Cloudflare Pages + D1):

```bash
npm install
npm run db:init:local           # lokal bazaga sxemani yozadi
npm run dev                     # → http://localhost:8788
                                #   admin: http://localhost:8788/admin/
```

Birinchi kirishda admin akkaunti so'raladi (parol kamida 8 belgi).

## Cloudflare'ga deploy (bepul)

Hammasi bepul tarifga sig'adi: D1 5 GB, kuniga 100 000 so'rov, Pages cheksiz
statik trafik. Karta talab qilinmaydi.

1. **Pages loyihasini ulang.** Cloudflare dashboard → Workers & Pages →
   Create → Pages → Connect to Git → shu repozitoriyni tanlang.
   - Build command: `npm run build`
   - Build output directory: `dist`
2. **Bazani yarating.** Storage & Databases → D1 → Create → nomi `digitalverse`.
   Console'ga o'tib `migrations/0001_init.sql` ichidagi SQL'ni bir marta bajaring.
3. **Bindinglarni qo'shing.** Pages loyihasi → Settings → Bindings:
   - D1 database: `DB` → `digitalverse`
   - Secret: `SESSION_SECRET` → uzun tasodifiy satr
     (`openssl rand -hex 32` bilan hosil qiling)
4. Qayta deploy qiling. `https://<loyiha>.pages.dev/admin/` ochilib, birinchi
   kirishda admin akkaunti yaratiladi.

CLI orqali ham bo'ladi: `npx wrangler login`, so'ng
`npx wrangler d1 create digitalverse` (chiqqan `database_id` ni `wrangler.toml`
ga yozing), `npm run db:init`, `npm run deploy`.

## Domenni ulash — digitalverse.kz

**Avval DNS tuzatilishi kerak.** 2026-10-06 holatiga ko'ra domen umuman
ishlamayapti: `.kz` registri uni ahost nameserverlariga yo'naltirgan
(`dns1/dns2.ahost.uz`, `ns1/ns2.ahost.cloud`), lekin ularning to'rttasi ham
`REFUSED` qaytaradi — ya'ni **zona yaratilmagan**. Shuning uchun har qanday
resolver `SERVFAIL` oladi va domen hech qayerga ulanmaydi.

Tekshirish:

```bash
dig +short NS digitalverse.kz          # bo'sh -> delegatsiya ishlamayapti
dig @dns1.ahost.uz digitalverse.kz SOA # REFUSED -> zona yo'q
```

### Tavsiya etilgan yo'l: nameserverlarni Cloudflare'ga berish

Bu bir vaqtning o'zida ikki muammoni yechadi — buzuq zonani ham, apex domen
masalasini ham (`digitalverse.kz` kabi apex'ga oddiy CNAME qo'yib bo'lmaydi,
Cloudflare esa CNAME flattening qiladi). SSL ham avtomatik va bepul.

1. **Cloudflare** → Add a site → `digitalverse.kz` → Free reja.
   Cloudflare ikkita nameserver beradi (masalan `xxx.ns.cloudflare.com`).
2. **ahost paneli** → domen → **Neymserverlar** tabi → mavjud to'rtta
   nameserverni o'chirib, Cloudflare bergan ikkitasini yozing.
3. `.kz` delegatsiyasi yangilanishini kuting (odatda 1–6 soat).
   Tekshirish: `dig +short NS digitalverse.kz`
4. **Pages loyihasi** tayyor bo'lgach (yuqoridagi «Cloudflare'ga deploy»
   bo'limi) → Custom domains → `digitalverse.kz` va `www.digitalverse.kz`
   qo'shing. Cloudflare DNS yozuvlarini o'zi yaratadi.

### Agar nameserverni ko'chirmoqchi bo'lmasangiz

DNS ahost'da qolsin desangiz, **DNS xosting** tabida zonani yaratib, Cloudflare
Pages bergan `<loyiha>.pages.dev` manziliga yozuv qo'shish kerak. Lekin apex
(`digitalverse.kz`) uchun ahost ALIAS/ANAME qo'llab-quvvatlashi shart — aks
holda faqat `www` ishlaydi. Shuning uchun nameserverni ko'chirish osonroq.

### Eslatma: GitHub Pages bilan domen

GitHub Pages ham apex domenni ko'taradi (A yozuvlari `185.199.108.153`,
`.109.153`, `.110.153`, `.111.153` + repo ildizida `CNAME` fayli), lekin u
statik — **admin panel va CRM ishlamaydi**. Shuning uchun domen Cloudflare'ga
ulanadi, GitHub Pages esa namoyish havolasi bo'lib qoladi.

## Admin panel

`/admin/` manzilida, uch bo'lim:

- **Matnlar** — saytdagi 62 ta matn maydoni. O'zgartirilganlari qizil nuqta
  bilan belgilanadi, «asliga» tugmasi bitta maydonni qaytaradi.
- **Portfolio** — ishlar qo'shish, rasm yuklash, tartibni o'zgartirish,
  yashirish. Saytdagi «Наши работы» bloki shu yerdan to'ladi.
- **CRM** — saytdagi formadan kelgan arizalar. Holat (yangi → ish jarayonida →
  muvaffaqiyatli / yo'qotilgan), izoh, CSV eksport. Telefon bosiladigan.

`/admin/#crm` kabi havolalar to'g'ridan-to'g'ri kerakli bo'limni ochadi.

### Matn tahrirlash qanday ishlaydi

Asl matn **`index.html` ichida qoladi** — bazada faqat o'zgartirishlar
saqlanadi. Har bir tahrirlanadigan element `data-cms="kalit"` atributiga ega;
server asl qiymatlarni chop etilgan `index.html` dan o'qiydi
(`lib/content.js` → `readDefaults`), yorliqlarni esa `CONTENT_META` dan oladi.

Natijada:
1. Baza bo'sh bo'lsa yoki backend umuman bo'lmasa (GitHub Pages) — sayt
   dizaynerdagi asl matn bilan chiqadi, hech narsa buzilmaydi.
2. Yangi maydon qo'shish uchun HTML'ga atribut va `CONTENT_META` ga bitta
   qator qo'shiladi, xolos.

### Rasmlar nega bazada saqlanadi

R2 bepul bo'lsa ham karta biriktirishni so'raydi. Shuning uchun portfolio
rasmlari D1 ichida blob sifatida yotadi, admin panel esa yuklashdan oldin
brauzerda rasmni 1400px gacha kichraytiradi (~850 KB chegara). Rasm
`/api/img/:id` orqali bir yillik kesh bilan beriladi.

## API

| Usul | Yo'l | Kim uchun |
|---|---|---|
| GET | `/api/content` | ochiq — faqat o'zgartirishlar |
| GET | `/api/portfolio` | ochiq — chop etilgan ishlar |
| GET | `/api/img/:id` | ochiq — portfolio rasmi |
| POST | `/api/leads` | ochiq — formadan ariza |
| GET/PUT | `/api/admin/content` | admin |
| CRUD | `/api/admin/portfolio` | admin |
| GET/PATCH/DELETE | `/api/admin/leads` | admin |
| GET | `/api/admin/leads.csv` | admin — Excel uchun BOM bilan |

Sessiya server tomonida saqlanmaydi: cookie HMAC bilan imzolanadi
(`lib/auth.js`), parollar esa PBKDF2-SHA256 (100k iteratsiya) bilan xeshlanadi —
Workers muhitida bcrypt yo'q.

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
