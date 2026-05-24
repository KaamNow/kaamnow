/**
 * KaamNow — Bilingual string table
 * All user-facing strings for the landing page and nav.
 * Keep translations natural and warm. Hinglish is fine for technical terms.
 */

const T = {
  en: {
    // ── Nav ──────────────────────────────────────────────────
    nav_home: "Home",
    nav_workers: "Find Local Experts",
    nav_work: "Find Work",
    nav_whatsapp: "WhatsApp",
    nav_contact: "Contact",
    contact_sheet_title: "Get in touch",
    contact_wa: "WhatsApp Support",
    contact_wa_hint: "Fastest response — usually within 1 hour",
    contact_email: "Send us an email",
    contact_email_hint: "contact@kaamnow.com",
    contact_close: "Close",
    footer_follow: "Follow us",
    nav_how_it_works: "How It Works",
    nav_login: "Login",

    // ── Find Work public page ─────────────────────────────────────────────
    fw_title: "Find Work",
    fw_sub: "Browse open jobs near you. No sign-up needed to explore.",
    fw_filter_pincode: "Pincode",
    fw_filter_category: "Category",
    fw_filter_sort: "Sort by",
    fw_sort_newest: "Newest First",
    fw_sort_popular: "Most Popular",
    fw_all_cats: "All Categories",
    fw_apply: "Interested / रुचि है",
    fw_login_apply: "Login to Apply",
    fw_pending: "Pending Approval",
    fw_withdraw: "Withdraw",
    fw_confirmed: "Booking Confirmed!",
    fw_rejected: "Not selected",
    fw_withdrawn: "Withdrawn",
    fw_completed: "Completed",
    fw_empty_title: "No jobs found",
    fw_empty_sub: "Try changing the filters, or check back soon.",
    fw_show_all: "Show all jobs",
    fw_posted_ago: "ago",
    fw_urgent: "Urgent",
    fw_per_day: "/day",
    fw_workers_needed: "Local Experts needed",
    fw_open_slots: "slot open",
    fw_pincode_hint: "6-digit pincode",
    fw_loading: "Loading jobs…",
    nav_signup: "Sign Up",
    nav_dashboard: "Dashboard",
    nav_logout: "Logout",

    // ── Hero ─────────────────────────────────────────────────
    hero_overline: "Find trusted Local Experts and nearby jobs",
    hero_headline_1: "Find work directly,",
    hero_headline_2: "without middlemen —",
    hero_headline_3: "right from your mobile.",
    hero_sub:
      "KaamNow connects skilled Local Experts with farmers, homeowners, and contractors. Over WhatsApp, voice, and the phone you already own. Fair pay. Verified trust. No dalal.",
    hero_cta_worker: "I need work",
    hero_cta_customer: "I need a Local Expert",
    hero_cta_demo: "Try WhatsApp Bot",
    hero_badge_verified: "Gaon Verified",
    hero_badge_tier: "Tier 2 trust badge",
    hero_badge_live: "Live",
    hero_badge_workers: "Local Experts online",

    // ── Role-based hero ────────────────────────────────────────
    hero_guest_tagline:   "Har haath ko kaam, har kaam ko samman.",
    hero_guest_t1:        "Built for",
    hero_guest_t2:        "India's",
    hero_guest_t3:        "local workforce.",
    hero_guest_sub:       "KaamNow connects Local Experts, homeowners, farmers, and contractors directly through mobile and WhatsApp.",
    hero_guest_desc:      "Verified trust. Fair opportunities. No middlemen.",
    hero_customer_t1:     "India's local workforce,",
    hero_customer_t2:     "on demand.",
    hero_customer_sub:    "Hire trusted Local Experts quickly and confidently.",
    hero_customer_desc:   "Find verified painters, helpers, electricians, plumbers, and daily-wage Local Experts from your nearby area.",
    hero_worker_t1:       "Local work opportunities,",
    hero_worker_t2:       "made simple.",
    hero_worker_sub:      "Connect directly with nearby customers and contractors.",
    hero_worker_desc:     "Get better work opportunities, fair hiring, and direct customer connections without middlemen.",
    cta_find_workers:     "Find Local Experts",
    cta_post_job:         "Post a Job",
    cta_find_jobs:        "Find Jobs",
    cta_whatsapp_bot:     "WhatsApp Bot",
    cta_find_work:        "Find Work",

    // ── Stats ─────────────────────────────────────────────────
    stat_workers: "Registered Local Experts",
    stat_villages: "Villages served",
    stat_wage: "Avg. daily wage",
    stat_match: "Avg. match time",

    // ── Find Work ─────────────────────────────────────────────
    findwork_overline: "For Local Experts",
    findwork_headline: "Stop waiting at the chowk.",
    findwork_headline_accent: "Jobs come to you.",
    findwork_sub:
      "Register once. Customers nearby post jobs every day. Get notified on WhatsApp.",
    findwork_cta_register: "Become a Local Expert",
    findwork_cta_browse: "Browse Job Feed",
    findwork_empty: "Loading job opportunities…",

    // ── Workers ───────────────────────────────────────────────
    workers_overline: "Hire locally",
    workers_headline: "Hire",
    workers_headline_accent: "verified Local Experts",
    workers_headline_end: "in minutes.",
    workers_cta: "Browse Marketplace",
    workers_filter_pin: "Pincode:",
    workers_filter_hint: "e.g. 302001",
    workers_request: "Request Local Expert",
    workers_empty: "No Local Experts listed in this area yet…",
    workers_jobs_done: "jobs done",

    // ── How it works ──────────────────────────────────────────
    how_overline: "How it works",
    how_headline: "Three steps.",
    how_headline_accent: "Zero middlemen.",
    how_step1_title: "Tell us over WhatsApp",
    how_step1_desc:
      "Voice message or text — Hindi works. Tell us the job, date, and your village. Takes 60 seconds.",
    how_step2_title: "We find trusted Local Experts nearby",
    how_step2_desc:
      "Sarpanch-vouched, peer-rated Local Experts within 5 km. Trust tier shown upfront.",
    how_step3_title: "They arrive. Work done. Pay cash or UPI.",
    how_step3_desc:
      "Cash-friendly. Rate the Local Expert after. Their reputation grows. So does yours.",

    // ── Features ──────────────────────────────────────────────
    feat_overline: "What makes us different",
    feat_headline: "Built for the",
    feat_headline_accent: "last village,",
    feat_headline_end: "not the metro.",
    feat_wa_title: "WhatsApp booking",
    feat_wa_desc:
      "700M+ Indians are already on WhatsApp. No app download, no learning curve.",
    feat_voice_title: "Voice-first",
    feat_voice_desc: "Speak in Bhojpuri, Marathi, Tamil. We understand.",
    feat_trust_title: "3-tier trust",
    feat_trust_desc: "Self-verified → Gaon Verified → KaamNow Pro.",
    feat_calendar_title: "Farm calendar",
    feat_calendar_desc: "Pre-book Local Experts 7 days before sowing or harvest.",
    feat_pay_title: "Cash + UPI both",
    feat_pay_desc: "Start with cash. Move to UPI when you're comfortable.",

    // ── Testimonial ───────────────────────────────────────────
    test_overline: "Their words",
    test_quote:
      '"Before, I got 12 days of work a month. Now it\'s 18. My children\'s school fees are covered."',
    test_name: "Ramesh Kumar, Mason",
    test_meta: "Pratapgarh, UP — 47 jobs on KaamNow",

    // ── Waitlist ──────────────────────────────────────────────
    wait_headline: "Coming soon to your village.",
    wait_sub:
      "Join the waitlist. Be among the first 100 villages we onboard.",
    wait_name: "Your name",
    wait_phone: "Mobile number",
    wait_role_customer: "I need Local Experts",
    wait_role_worker: "I am a Local Expert",
    wait_role_partner: "NGO / Govt partner",
    wait_cta: "Join Waitlist",
    wait_cta_loading: "Joining…",
    wait_success: "You're on the list! We'll be in touch soon.",
    wait_error: "Could not join. Please try again.",

    // ── Service categories ────────────────────────────────────
    cat_heading: "What work do you need done?",
    cat_sub: "Choose a category — see verified Local Experts available near you",
    cat_construction: "Construction",
    cat_farm: "Agriculture",
    cat_electrical: "Electrical",
    cat_cleaning: "Cleaning",
    cat_transport: "Transport",
    cat_mechanical: "Mechanical",
    cat_tailoring: "Tailoring",
    cat_home: "Home Services",
    cat_other: "Other",
    cat_workers: "Local Experts nearby",

    // ── WhatsApp feature ──────────────────────────────────────
    wa_section_overline: "Our biggest advantage",
    wa_section_heading: "Find work on WhatsApp. No app needed.",
    wa_section_sub: "700M+ Indians are already on WhatsApp. Type JOBS to see work near you. Type APPLY to send your interest. Done in seconds.",
    wa_cmd1: "JOBS – open work near you",
    wa_cmd2: "APPLY – send interest in one tap",
    wa_cmd3: "STATUS – check active bookings",
    wa_cmd4: "WITHDRAW – cancel anytime",
    wa_try: "Try the bot now",

    // ── Extra testimonials ────────────────────────────────────
    test2_quote: '"KaamNow sent me a WhatsApp for a painting job nearby. I applied, got confirmed same day. 20 minutes total."',
    test2_name: "Sunita Devi, Painter",
    test2_meta: "Muzaffarpur, Bihar — 32 jobs done",
    test3_quote: '"Contractors used to take a cut from every booking. Here the customer pays me directly. No one in between."',
    test3_name: "Suresh Sharma, Plumber",
    test3_meta: "Wardha, Maharashtra — 63 jobs done",

    // ── FAQ ───────────────────────────────────────────────────
    faq_heading: "Common Questions",
    faq_q1: "Is KaamNow free for Local Experts?",
    faq_a1: "Yes — completely free. Register, build a profile, get job alerts at zero cost.",
    faq_q2: "How does payment work?",
    faq_a2: "Cash or UPI, directly between you and the customer. KaamNow never holds money.",
    faq_q3: "How do I know the Local Expert is trustworthy?",
    faq_a3: "Every Local Expert has a visible trust tier: Self-verified → Gaon Verified → KaamNow Pro. Past customer ratings are always shown.",
    faq_q4: "No smartphone — can I still use KaamNow?",
    faq_a4: "Yes. Our WhatsApp bot works on any phone that runs WhatsApp. Type JOBS to see nearby work.",
    faq_q5: "What if a Local Expert doesn't show up?",
    faq_a5: "Rate and report after every job. Poor-rated Local Experts lose their tier. Contact support on WhatsApp for disputes.",
    faq_q6: "How quickly can I find a Local Expert?",
    faq_a6: "Usually within 15 minutes. Local Experts get an instant WhatsApp alert the moment you post.",

    // ── Footer ────────────────────────────────────────────────
    footer_tagline: "Proudly made in Bharat.",
    footer_privacy: "Privacy",
    footer_marketplace: "Marketplace",
    footer_whatsapp: "WhatsApp",
    footer_copy: `© ${new Date().getFullYear()} KaamNow. Built for Bharat.`,

    // ── Mobile sticky bar ─────────────────────────────────────
    mob_workers: "Find Experts",
    mob_work: "Find Work",
  },

  hi: {
    // ── Nav ──────────────────────────────────────────────────
    nav_home: "होम",
    nav_workers: "मजदूर ढूंढें",
    nav_work: "काम ढूंढें",
    nav_whatsapp: "WhatsApp",
    nav_contact: "संपर्क",
    contact_sheet_title: "हमसे बात करें",
    contact_wa: "WhatsApp पर संपर्क करें",
    contact_wa_hint: "सबसे तेज़ — आमतौर पर 1 घंटे में जवाब",
    contact_email: "ईमेल भेजें",
    contact_email_hint: "contact@kaamnow.com",
    contact_close: "बंद करें",
    footer_follow: "हमें फ़ॉलो करें",
    nav_how_it_works: "कैसे काम करता है",
    nav_login: "लॉगिन",

    // ── Find Work public page ─────────────────────────────────────────────
    fw_title: "काम ढूंढें",
    fw_sub: "आसपास के खुले काम देखें। देखने के लिए लॉगिन की ज़रूरत नहीं।",
    fw_filter_pincode: "पिनकोड",
    fw_filter_category: "श्रेणी",
    fw_filter_sort: "क्रम से",
    fw_sort_newest: "सबसे नया पहले",
    fw_sort_popular: "सबसे लोकप्रिय",
    fw_all_cats: "सभी श्रेणियां",
    fw_apply: "रुचि है / Interested",
    fw_login_apply: "Apply करने के लिए Login करें",
    fw_pending: "अनुमोदन बाकी",
    fw_withdraw: "वापस लें",
    fw_confirmed: "बुकिंग पक्की!",
    fw_rejected: "चयन नहीं हुआ",
    fw_withdrawn: "वापस लिया",
    fw_completed: "पूरा हुआ",
    fw_empty_title: "कोई काम नहीं मिला",
    fw_empty_sub: "फ़िल्टर बदलें या थोड़ी देर बाद देखें।",
    fw_show_all: "सभी काम दिखाएं",
    fw_posted_ago: "पहले",
    fw_urgent: "तुरंत चाहिए",
    fw_per_day: "/दिन",
    fw_workers_needed: "मजदूर चाहिए",
    fw_open_slots: "जगह बाकी",
    fw_pincode_hint: "6-अंक का पिनकोड",
    fw_loading: "काम लोड हो रहा है…",
    nav_signup: "साइन अप",
    nav_dashboard: "डैशबोर्ड",
    nav_logout: "लॉगआउट",

    // ── Hero ─────────────────────────────────────────────────
    hero_overline: "Trusted Local Experts aur nearby kaam — ek jagah",
    hero_headline_1: "अब काम ढूंढना हुआ आसान —",
    hero_headline_2: "बिना दलाल,",
    hero_headline_3: "सीधे मोबाइल से।",
    hero_sub:
      "KaamNow जोड़ता है रोज़-कमाने वाले मजदूरों को किसानों, घर मालिकों और ठेकेदारों से। WhatsApp पर, हिंदी में, आपके अपने मोबाइल से। सही मज़दूरी। भरोसेमंद काम। कोई दलाल नहीं।",
    hero_cta_worker: "मुझे काम चाहिए",
    hero_cta_customer: "मुझे मजदूर चाहिए",
    hero_cta_demo: "WhatsApp Bot देखें",
    hero_badge_verified: "गाँव सत्यापित",
    hero_badge_tier: "Tier 2 भरोसा",
    hero_badge_live: "लाइव",
    hero_badge_workers: "मजदूर ऑनलाइन",

    // ── Role-based hero ────────────────────────────────────────
    hero_guest_tagline:   "हर हाथ को काम, हर काम को सम्मान।",
    hero_guest_t1:        "बना है",
    hero_guest_t2:        "भारत के",
    hero_guest_t3:        "स्थानीय मजदूरों के लिए।",
    hero_guest_sub:       "KaamNow जोड़ता है मजदूरों को घर मालिकों, किसानों और ठेकेदारों से — सीधे मोबाइल और WhatsApp पर।",
    hero_guest_desc:      "भरोसेमंद। सही मज़दूरी। कोई दलाल नहीं।",
    hero_customer_t1:     "भारत के स्थानीय मजदूर,",
    hero_customer_t2:     "जब चाहें तब।",
    hero_customer_sub:    "पास के भरोसेमंद मजदूर जल्दी और आसानी से hire करें।",
    hero_customer_desc:   "पेंटर, हेल्पर, इलेक्ट्रीशियन, प्लंबर और रोज़ कमाने वाले मजदूर — आपके आस-पास से।",
    hero_worker_t1:       "पास में काम के मौके,",
    hero_worker_t2:       "आसान तरीके से।",
    hero_worker_sub:      "पास के ग्राहकों और ठेकेदारों से सीधे जुड़ें।",
    hero_worker_desc:     "बेहतर काम, सही मज़दूरी और ग्राहकों से सीधा संपर्क — बिना किसी दलाल के।",
    cta_find_workers:     "मजदूर ढूंढें",
    cta_post_job:         "काम पोस्ट करें",
    cta_find_jobs:        "काम ढूंढें",
    cta_whatsapp_bot:     "WhatsApp Bot",
    cta_find_work:        "काम ढूंढें",

    // ── Stats ─────────────────────────────────────────────────
    stat_workers: "पंजीकृत मजदूर",
    stat_villages: "गाँवों में सेवा",
    stat_wage: "औसत रोज़ की मज़दूरी",
    stat_match: "औसत मैच समय",

    // ── Find Work ─────────────────────────────────────────────
    findwork_overline: "मजदूरों के लिए",
    findwork_headline: "चौक पर खड़े रहना बंद करो।",
    findwork_headline_accent: "काम खुद आएगा।",
    findwork_sub:
      "एक बार रजिस्टर करो। आसपास के ग्राहक रोज़ काम पोस्ट करते हैं। WhatsApp पर तुरंत खबर।",
    findwork_cta_register: "मजदूर के रूप में रजिस्टर करें",
    findwork_cta_browse: "काम की लिस्ट देखें",
    findwork_empty: "काम लोड हो रहा है…",

    // ── Workers ───────────────────────────────────────────────
    workers_overline: "पास से भर्ती करें",
    workers_headline: "भरोसेमंद",
    workers_headline_accent: "मजदूर मिलेंगे",
    workers_headline_end: "कुछ ही मिनटों में।",
    workers_cta: "मार्केटप्लेस देखें",
    workers_filter_pin: "पिनकोड:",
    workers_filter_hint: "जैसे 302001",
    workers_request: "मजदूर बुलाएं",
    workers_empty: "इस इलाके में अभी कोई मजदूर नहीं…",
    workers_jobs_done: "काम पूरे",

    // ── How it works ──────────────────────────────────────────
    how_overline: "कैसे काम करता है?",
    how_headline: "तीन कदम।",
    how_headline_accent: "कोई दलाल नहीं।",
    how_step1_title: "WhatsApp पर बताएं",
    how_step1_desc:
      "वॉयस मेसेज या टेक्स्ट — हिंदी चलेगी। काम, तारीख और गाँव बताओ। बस 60 सेकंड।",
    how_step2_title: "हम पास के भरोसेमंद मजदूर ढूंढेंगे",
    how_step2_desc:
      "सरपंच से सत्यापित, पड़ोसियों से रेटेड। 5 km के अंदर। भरोसे का बैज दिखता है।",
    how_step3_title: "मजदूर आएगा। काम होगा। कैश या UPI।",
    how_step3_desc:
      "कैश में भुगतान चलता है। काम के बाद रेटिंग दो। सबकी इज्ज़त बढ़ेगी।",

    // ── Features ──────────────────────────────────────────────
    feat_overline: "हम क्यों अलग हैं",
    feat_headline: "बना है",
    feat_headline_accent: "आखिरी गाँव के लिए,",
    feat_headline_end: "शहर के लिए नहीं।",
    feat_wa_title: "WhatsApp पर बुकिंग",
    feat_wa_desc:
      "70 करोड़ भारतीय WhatsApp पर हैं। कोई नई App डाउनलोड नहीं, कोई झंझट नहीं।",
    feat_voice_title: "बोलकर काम बताएं",
    feat_voice_desc: "भोजपुरी, मराठी, तमिल — हम समझेंगे।",
    feat_trust_title: "तीन स्तर का भरोसा",
    feat_trust_desc: "खुद सत्यापित → गाँव सत्यापित → KaamNow Pro।",
    feat_calendar_title: "खेती का कैलेंडर",
    feat_calendar_desc: "बुवाई या कटाई से 7 दिन पहले मजदूर बुक करो।",
    feat_pay_title: "कैश और UPI दोनों",
    feat_pay_desc: "शुरुआत कैश से। जब मन हो UPI पर जाएं।",

    // ── Testimonial ───────────────────────────────────────────
    test_overline: "उनकी ज़बानी",
    test_quote:
      "\"पहले महीने में 12 दिन काम मिलता था, अब 18 दिन। बच्चों की पढ़ाई भी चल रही है।\"",
    test_name: "रमेश कुमार, राज मिस्त्री",
    test_meta: "प्रतापगढ़, UP — 47 काम पूरे KaamNow पर",

    // ── Waitlist ──────────────────────────────────────────────
    wait_headline: "आपके गाँव में जल्द आ रहे हैं।",
    wait_sub: "वेटलिस्ट में जुड़ें। पहले 100 गाँवों में शामिल हों।",
    wait_name: "आपका नाम",
    wait_phone: "मोबाइल नंबर",
    wait_role_customer: "मुझे मजदूर चाहिए",
    wait_role_worker: "मैं मजदूर हूं",
    wait_role_partner: "NGO / सरकारी साझेदार",
    wait_cta: "वेटलिस्ट में जुड़ें",
    wait_cta_loading: "जोड़ा जा रहा है…",
    wait_success: "आप लिस्ट में हैं! जल्द संपर्क करेंगे।",
    wait_error: "हो नहीं पाया। फिर कोशिश करें।",

    // ── Service categories ────────────────────────────────────
    cat_heading: "कौन सा काम करवाना है?",
    cat_sub: "Category चुनें — पास के verified मजदूर दिखेंगे",
    cat_construction: "निर्माण",
    cat_farm: "खेती-बाड़ी",
    cat_electrical: "बिजली काम",
    cat_cleaning: "सफाई",
    cat_transport: "गाड़ी-चालन",
    cat_mechanical: "मशीन मरम्मत",
    cat_tailoring: "सिलाई-कढ़ाई",
    cat_home: "घरेलू सेवा",
    cat_other: "अन्य",
    cat_workers: "मजदूर पास में",

    // ── WhatsApp feature ──────────────────────────────────────
    wa_section_overline: "हमारी सबसे बड़ी खूबी",
    wa_section_heading: "WhatsApp पर काम मिलेगा। कोई नई App नहीं।",
    wa_section_sub: "70 करोड़ भारतीय WhatsApp पर हैं। JOBS लिखो — पास के काम दिखेंगे। APPLY लिखो — request जाएगी। बस।",
    wa_cmd1: "JOBS – पास के खुले काम देखें",
    wa_cmd2: "APPLY – एक tap में interest भेजें",
    wa_cmd3: "STATUS – अपनी bookings देखें",
    wa_cmd4: "WITHDRAW – approval से पहले रद्द करें",
    wa_try: "Bot आज़माएं",

    // ── Extra testimonials ────────────────────────────────────
    test2_quote: '"KaamNow ने पास की painting job का WhatsApp भेजा। Apply किया, उसी दिन confirm हुआ। 20 मिनट में काम मिला।"',
    test2_name: "सुनीता देवी, Painter",
    test2_meta: "मुजफ्फरपुर, Bihar — 32 काम पूरे",
    test3_quote: '"पहले ठेकेदार हर booking में कुछ काट लेते थे। यहाँ customer सीधे मुझे देता है। कोई बीच में नहीं।"',
    test3_name: "सुरेश शर्मा, Plumber",
    test3_meta: "वर्धा, Maharashtra — 63 काम पूरे",

    // ── FAQ ───────────────────────────────────────────────────
    faq_heading: "अक्सर पूछे जाने वाले सवाल",
    faq_q1: "क्या मजदूरों के लिए KaamNow फ्री है?",
    faq_a1: "हाँ — बिल्कुल फ्री। Register करो, profile बनाओ, job alerts पाओ। कोई charge नहीं।",
    faq_q2: "पैसे कैसे मिलते हैं?",
    faq_a2: "Cash या UPI — सीधे customer से। KaamNow बीच में पैसे नहीं रखता।",
    faq_q3: "मजदूर भरोसेमंद है, कैसे पता चलेगा?",
    faq_a3: "हर मजदूर का Trust Tier दिखता है: खुद सत्यापित → गाँव सत्यापित → KaamNow Pro। पुराने काम की रेटिंग हमेशा दिखती है।",
    faq_q4: "Smartphone नहीं है — क्या फिर भी काम मिलेगा?",
    faq_a4: "हाँ। हमारा WhatsApp bot किसी भी phone पर चलता है। JOBS लिखो — पास के काम दिखेंगे।",
    faq_q5: "मजदूर नहीं आया तो क्या करें?",
    faq_a5: "हर काम के बाद rating और report करें। खराब rating वाले tier खो देते हैं। WhatsApp पर support से बात करें।",
    faq_q6: "मजदूर कितनी जल्दी मिल जाएगा?",
    faq_a6: "आमतौर पर 15 मिनट में। Job post करते ही पास के मजदूरों को WhatsApp alert जाता है।",

    // ── Footer ────────────────────────────────────────────────
    footer_tagline: "गर्व से भारत में बना।",
    footer_privacy: "गोपनीयता",
    footer_marketplace: "मार्केटप्लेस",
    footer_whatsapp: "WhatsApp",
    footer_copy: `© ${new Date().getFullYear()} KaamNow। भारत के लिए बनाया।`,

    // ── Mobile sticky bar ─────────────────────────────────────
    mob_workers: "मजदूर ढूंढें",
    mob_work: "काम ढूंढें",
  },
};

export default T;
