# 🚀 Dokploy Deployment & Persistent Database Guide
# ডকপ্লয় (Dokploy) ডিপ্লয়মেন্ট এবং পারসিস্টেন্ট ডাটাবেস গাইড

এই প্রজেক্টটি **Dokploy** (অথবা Coolify / Docker VPS)-এ ১-ক্লিকে ডিপ্লয় করার জন্য সম্পূর্ণ প্রস্তুত করা হয়েছে।

---

## 📌 সংক্ষেপে ডিপ্লয়মেন্টের মূল বিষয়সমূহ (Key Highlights)

1. **Multi-Stage Production Dockerfile:** তৈরি করা আছে, যাতে ক্লায়েন্ট বিল্ড (`dist/`) এবং অপটিমাইজড সার্ভার বান্ডেল (`server-dist/server.js`) স্বয়ংক্রিয়ভাবে তৈরি হয়।
2. **Persistent Database Volume (`/data`):** অ্যাপ্লিকেশনের সব ইউজার ওয়ালেট, পাসওয়ার্ড, বেটিং হিস্ট্রি, ক্যাশিয়ার ট্রানজেকশন এবং স্ন্যাপশট ব্যাকআপ `/data` ডিরেক্টরিতে নিরাপদে জমা হয়। কনটেইনার রিস্টার্ট বা রিডিপ্লয় করলেও কোনো ডাটা হারাবে না।
3. **Health Check Built-in:** `/api/health` এন্ডপয়েন্ট Dokploy এবং Docker-এর জন্য সার্বক্ষণিক কনটেইনার হেলথ মনিটর করে।
4. **WebSocket & PWA Support:** পোর্ট `3000`-এ রিয়েলটাইম মাল্টিপ্লেয়ার ডুয়েল রুম এবং ওয়েবসকেট ফুল সাপোর্ট সহ রান করে।

---

## 🛠️ ডিপ্লয় করার ২টি সহজ পদ্ধতি (2 Ways to Deploy in Dokploy)

### 🔹 পদ্ধতি ১: Dockerfile দিয়ে ডিপ্লয় (সবচেয়ে সহজ - Recommended)

1. **Dokploy ড্যাশবোর্ডে লগইন করুন:**
   - আপনার VPS-এ Dokploy প্যানেল ওপেন করুন।
   - **Projects** > নতুন একটি প্রজেক্ট সিলেক্ট করুন বা তৈরি করুন।
   - **Create Application**-এ ক্লিক করুন।

2. **Git Repository লিঙ্ক করুন:**
   - **Source:** GitHub / Git Repository বেছে নিন।
   - আপনার রিপোজিটরি URL এবং Branch (যেমন: `main`) সিলেক্ট করুন।

3. **Build Type নির্বাচন করুন:**
   - **Build Type:** `Dockerfile` সিলেক্ট করুন।
   - **Dockerfile Path:** `./Dockerfile` (ডিফল্ট থাকবে)।

4. **Environment Variables সেট করুন:**
   Dokploy অ্যাপের **Environment** ট্যাবে নিচের ভেরিয়েবলগুলো পেস্ট করুন:
   ```env
   NODE_ENV=production
   PORT=3000
   HOST=0.0.0.0
   DATA_DIR=/data
   PERSISTENT_DATA_DIR=/data
   ```

5. **Persistent Volume (ডাটাবেস সংরক্ষণ) মাউন্ট করুন:**
   - Dokploy অ্যাপ্লিকেশনের **Volumes** বা **Storage** ট্যাবে যান।
   - **Add Volume** ক্লিক করুন:
     - **Host Path:** `/etc/dokploy/volumes/dragon_tiger_data` (অথবা Dokploy-এর ডিফল্ট ভলিউম নাম)
     - **Mount Path:** `/data`
   - এই স্টেপটি সম্পূর্ণ গুরুত্বপূর্ণ। এর মাধ্যমে আপনার সব প্লেয়ারের কয়েন ব্যালেন্স, আইডি এবং হিস্ট্রি স্থায়ীভাবে জমা থাকবে।

6. **Port ও Domain সেট করুন:**
   - **Port:** `3000`
   - **Domain:** আপনার ডোমেইন নাম দিন (যেমন: `casino.yourdomain.com`) এবং **Certificate: Let's Encrypt** (Auto SSL) টিক দিন।

7. **Deploy ক্লিক করুন:**
   - **Deploy** বাটনে ক্লিক করুন। ২ মিনিটের মধ্যে অ্যাপ লাইভ হয়ে যাবে!

---

### 🔹 পদ্ধতি ২: Docker Compose দিয়ে ডিপ্লয় (Full-Stack)

Dokploy-তে যদি আপনি **Compose** ব্যবহার করতে চান:

1. Dokploy-তে **Create Compose** সিলেক্ট করুন।
2. রিপোজিটরির `docker-compose.yml` ফাইলটি অটোমেটিকভাবে লোড হবে অথবা নিচের কোডটি পেস্ট করতে পারেন:

```yaml
version: "3.8"

services:
  dragon-tiger:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: dragon-tiger-p2p
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOST=0.0.0.0
      - DATA_DIR=/data
      - PERSISTENT_DATA_DIR=/data
    volumes:
      - dragon_tiger_data:/data
    healthcheck:
      test: ["CMD", "curl", "-fs", "http://localhost:3000/api/health"]
      interval: 20s
      timeout: 5s
      retries: 3
      start_period: 10s

volumes:
  dragon_tiger_data:
    name: dragon_tiger_persistent_db
    driver: local
```

3. **Deploy Compose** ক্লিক করুন। ভলিউম `dragon_tiger_persistent_db` অটোমেটিক তৈরি হয়ে সব ডাটা সেভ রাখবে।

---

## 💾 ডাটাবেস ব্যাকআপ এবং রিস্টোর (Database Backup & Restore)

Dokploy-তে ডাটাবেস ব্যাকআপ রাখা অত্যন্ত সহজ:

### অটোমেটিক স্ন্যাপশট:
সার্ভারটি প্রতিবার ডাটা পরিবর্তনের পর স্বয়ংক্রিয়ভাবে কম্প্যাক্ট স্ন্যাপশট তৈরি করে:
- `/data/users_store.json` - সকল প্লেয়ার ওয়ালেট ও ব্যালেন্স
- `/data/credentials_store.json` - লগইন ক্রেডেনশিয়াল
- `/data/bet_history_store.json` - সকল বেটিং হিস্ট্রি
- `/data/cashier_store.json` - ডিপোজিট ও উইথড্রয়াল রেকর্ড
- `/data/snapshots/db_snapshot_latest.json` - ফুল সিস্টেম ব্যাকআপ

### অ্যাডমিন প্যানেল থেকে ডাউনলোড ব্যাকআপ:
1. অ্যাডমিন প্যানেলে যান (`/#/admin`)।
2. **Export Database** বাটনে ক্লিক করে ফুল ব্যাকআপ JSON ১-ক্লিকে ডাউনলোড করে রাখতে পারবেন।
3. নতুন কোনো সার্ভারে স্থানান্তরের সময় **Import Database** দিয়ে সরাসরি রিস্টোর করা যাবে।

---

## 🔍 স্বাস্থ্য পরীক্ষা ও ভেরিফিকেশন (Health Check & Diagnostics)

ডিপ্লয়মেন্ট সফল হয়েছে কিনা তা চেক করার জন্য:
- `https://your-domain.com/api/health` ব্রাউজারে ওপেন করলে `{"status":"ok", "uptime": ...}` দেখতে পাবেন।
- `https://your-domain.com/api/version` ডিপ্লয়মেন্ট ভার্সন ও বিল্ড হ্যাশ প্রদর্শন করবে।
- `https://your-domain.com/api/tables` লাইভ গেম টেবিল এবং পি২পি রুমের লাইভ স্ট্যাটাস রিটার্ন করবে।
