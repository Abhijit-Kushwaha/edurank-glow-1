

## Advanced Filter System + AI-Driven Video Quality Scoring

### Current State
- `FilterContext` exists with Class/Subject/Board/Language/VideoType/Duration options but is **never used** by any component
- `find-video` edge function currently ranks videos by **engagement score** (views, likes, popularity) — the exact opposite of what's requested
- Dashboard's "Add Task" flow sends only `topic` to `find-video` with no filter data
- No video metadata caching table exists
- No transcript analysis occurs

### Plan

#### 1. Database: Add video cache table

Create a `video_cache` table to store AI-evaluated video results and prevent redundant API calls:
- `id`, `search_key` (hash of topic+filters), `topic`, `filters` (jsonb), `video_id`, `quality_scores` (jsonb with the full scoring breakdown), `title`, `channel`, `thumbnail`, `duration`, `summary`, `strengths` (jsonb), `weaknesses` (jsonb), `recommended_grade`, `created_at`, `expires_at` (TTL for cache, e.g. 7 days)
- RLS: authenticated users can SELECT; INSERT via edge function using service role
- Index on `search_key` for fast cache lookups

#### 2. Edge Function: Rewrite `find-video` scoring logic

Replace the engagement-based ranking with AI-driven educational quality scoring:

- **Accept filters** from request body: `{ topic, filters: { class, subject, board, language } }`
- **Cache check first**: Query `video_cache` by `search_key` hash. If fresh result exists, return it immediately
- **YouTube search**: Build filter-aware search query (e.g. "CBSE Class 10 Physics Newton's Laws Hindi tutorial explained")
- **Fetch transcripts**: Use YouTube captions API (`/api/timedtext`) for top 5 candidates
- **AI quality evaluation**: Send each video's title + description + transcript excerpt to Lovable AI with a structured scoring prompt:
  - Concept clarity (20pts), Depth (15pts), Logical structure (10pts), Accuracy confidence (15pts), Syllabus relevance (15pts), Examples quality (10pts), Subtopic coverage (10pts), Comprehension simplicity (5pts)
  - Penalize clickbait, filler, shallow content
  - Reward step-by-step explanations, definitions, real-world examples
  - Use tool calling to extract structured JSON output
- **Return top 1 best match** with full quality score breakdown
- **Cache the result** in `video_cache`
- Keep subtask breakdown logic but also apply quality scoring to subtask videos

#### 3. Frontend: Filter UI on Dashboard

Add a collapsible filter bar above the "Add Task" input:
- Dropdowns for: Class, Subject (dynamic based on class), Board (add "UP Board" to options), Language
- Use existing `FilterContext` — wire `useFilters()` into Dashboard
- Pass selected filters to `find-video` when adding a task
- Show the quality score and grade recommendation on task cards

#### 4. FilterContext Updates

- Add "UP Board" to the boards list (requested in spec alongside CBSE/ICSE)
- No other structural changes needed — the context is already well-designed

#### 5. Response Format

The edge function returns:
```json
{
  "video_id": "...",
  "quality_score": 87,
  "clarity_score": 18,
  "depth_score": 13,
  "accuracy_confidence": 14,
  "syllabus_match_score": 12,
  "knowledge_density_score": 8,
  "summary": "...",
  "strengths": ["Step-by-step derivation", "Clear diagrams"],
  "weaknesses": ["Missing practice problems"],
  "recommended_for_grade": "Class 10",
  "subtasks": [...]
}
```

### Technical Details

- **Cache key**: SHA-256 hash of `topic + class + subject + board + language` (normalized lowercase)
- **Cache TTL**: 7 days — after which re-evaluation occurs
- **Transcript fetching**: YouTube auto-captions via `https://www.youtube.com/api/timedtext?v={id}&lang={lang}`. If unavailable, score based on title+description only with reduced confidence
- **Rate limiting**: Existing rate limit (10/hr, 50/day) remains. Cache hits don't count against limits
- **YouTube API quota**: Reduced from fetching 5 videos per subtask to 3, since we only need top 1 quality match
- **AI calls**: One batch evaluation call per search (all 5 candidates in one prompt) to minimize API usage

