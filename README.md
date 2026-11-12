# 🎓 DYOD AI — Dedicated Academic Companion for DYOD @ IUST

> **Your dedicated academic companion.**  
> A focused AI academic assistant built exclusively for the **Design Your Own Degree (DYOD)** undergraduate programme at the **Islamic University of Science and Technology (IUST)**, Awantipora, Kashmir.

---

## 🌟 Product Principles

1. **DYOD ONLY:** The assistant answers questions exclusively about the DYOD programme at IUST using an approved academic knowledge base. It does not behave like a generic chatbot.
2. **Retrieval-Augmented Generation (RAG):** The language model writes the answer; the approved knowledge base determines what it is allowed to answer.
3. **Traceable Citations:** Every grounded answer cites actual document titles, page numbers, and section headings.
4. **Honest Limitations:** If a question is academically relevant but not supported by the available material, it states so honestly instead of hallucinating.
5. **₹0 Budget Guarantee:** Built strictly for free-tier infrastructure. No paid API dependencies, subscriptions, or automatic paid fallback.

---

## 🏗️ Architecture Overview

```
                      +-----------------------------+
                      |       Student Query         |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |   Layer 1: Scope Classifier |
                      |    (DYOD vs Prohibited /    |
                      |      Prompt Injection)      |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |  Layer 2: Local BM25 Engine |
                      |   (MiniSearch Over Approved |
                      |      78 Document Chunks)    |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |   Layer 3: Evidence Check   |
                      |   (Score Threshold & Topic  |
                      |     Substantive Matches)    |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      | Layer 4: Gemini Free Tier   |
                      |   (Grounded System Prompt   |
                      |    & Answer Style Directive)|
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      | Layer 5: Citation Validator |
                      |   (Matches Real Pages and   |
                      |      Retrieved Chunks)      |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      | Verified Response + Excerpts|
                      +-----------------------------+
```

---

## 📚 Approved DYOD Knowledge Base

The active BM25 search index contains **78 approved academic chunks** extracted from 5 core official documents:

1. **DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST** (32 pages)
   - 8 multidisciplinary baskets, NEP 2020 alignment, credit categorization, major combinations, and early exit rules.
2. **Evaluation Strategy for Term-End Project of Undergraduate Students, BS DYOD, IUST** (5 pages)
   - Official rubrics, deliverable milestones, phased evaluations, and viva voce assessment parameters.
3. **From Waste Paper to Seed Paper Phase 2: Detailed Project Implementation & Methodology** (6 pages)
   - Hands-on practical procedures for paper collection, soaking, blending, pulp formulation, deckle screening, and drying.
4. **Sustainability & Material Reuse: Waste Paper to Seed Paper Practical Guide** (12 pages)
   - Campus waste recovery workflows, circular economy strategies, and plantable paper design.
5. **BS DYOD Term-End Project Literature & Technical Compendium: Waste Paper to Seed Paper** (23 pages)
   - Fiber chemistry, hydrogen bonding, ink phytotoxicity standards, germination protocols, and viva defense handbook.

---

## 🔒 Approved API Provider Configuration

- **Primary Conversational Provider:** Google Gemini API (Free Tier Only, `gemini-3.1-flash-lite` / `gemini-3.8-flash`)
- **Development/Evaluation Provider:** NVIDIA Nemotron 3.5 Bolt E4B (`NVIDIA_EVALUATION_ENABLED=false` by default in production)
- **Strict Exclusions (per PRD Section 4):**
  - Mistral API: Excluded (paid API billing required)
  - DeepSeek API: Excluded (token billing required)
  - Deploy.com API: Excluded pending provider verification
- **Strict No-Paid-Fallback:** If free tier quota is reached, a friendly service message is returned. The system never invokes paid third-party endpoints.

---

## 🎨 Answer Styles

Students can dynamically switch between 6 learning styles:
1. **Detailed Explanation:** Comprehensive academic depth with definitions and relationships.
2. **Simple Language:** Accessible phrasing and intuitive analogies.
3. **Exam-Oriented:** Structured response with headings, points, and summary conclusions.
4. **Quick Revision:** High-yield bullet points and definitions for rapid review.
5. **Step-by-Step:** Sequential procedural breakdown.
6. **Comparison:** Markdown comparison table contrasting concepts from the source material.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js >= 18
- Free Google Gemini API Key

### 2. Installation
```bash
git clone https://github.com/aatifhussainqazi/dyod-ai.git
cd dyod-ai
npm install
```

### 3. Environment Setup
Create `.env.local`:
```env
PORT=3001
GEMINI_API_KEY=your_gemini_free_tier_key
GEMINI_MODEL=gemini-3.1-flash-lite
GEMINI_FREE_TIER_ONLY=true

NVIDIA_API_KEY=
NVIDIA_CHAT_MODEL=nvidia/nemotron-3.5-bolt-e4b
NVIDIA_PARSE_MODEL=nemotron-3.5-parse
NVIDIA_EVALUATION_ENABLED=false

ALLOWED_ORIGINS=*
MAX_OUTPUT_TOKENS=1200
MAX_REQUEST_SIZE=10000
RATE_LIMIT_MAX_REQUESTS=40
RATE_LIMIT_WINDOW_MS=60000
```

### 4. Knowledge Ingestion & Indexing
```bash
# Ingest approved documents from knowledge_base/approved/
npm run ingest

# Build the local BM25 MiniSearch index
npm run build-index

# Validate knowledge base integrity
npm run validate-kb
```

### 5. Running Locally
```bash
# Start backend API (port 3001)
npm run server

# In another terminal, start frontend dev server (port 5173)
npm run dev
```

### 6. Automated Evaluation Test Suite
Run the 12-point quality assurance test suite covering in-scope questions, insufficient evidence, out-of-scope refusals, follow-ups, hallucination guards, and prompt-injection resistance:
```bash
npm run eval
```

---

## 🔌 Future DYOD Playground Integration

DYOD AI provides a clean API contract for future integration into the existing **DYOD Playground** website:

### API Endpoints
- `POST /api/chat`: Grounded conversational endpoint with citation metadata.
- `GET /api/health`: Health status, provider information, and knowledge base stats.
- `GET /api/sources`: Sanitized list of approved documents and page counts.

### Integration Options
1. **Floating Assistant Button:** A lightweight React trigger opening a slide-out assistant panel.
2. **Embedded Widget:** An `<iframe>` or React component embeddable on any page.
3. **Dedicated AI Page:** A dedicated route within DYOD Playground calling the reusable DYOD AI backend.

---

## 📜 License & Disclaimer

*DYOD AI is an academic assistant designed for the DYOD community at IUST. All responses are derived from approved academic materials. Students should verify official notices and circulars directly with the university administration.*
