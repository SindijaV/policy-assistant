# Evaluation report — 27 October 2026

## Scope and review

300 questions were run through all three methods: 98 direct questions (the previous per-policy set), 98 locally authored natural paraphrases, 98 missing-detail questions and six unrelated questions. Each policy has one question of each of the first three types. The full initial run is 900 answers, including 600 live generation calls and 300 question-embedding calls. There were no provider errors. Policies and question text were treated as data. The original policy CSV was not changed.

Expected direct answers and paraphrases were checked against the original source sentences. Missing-detail questions use seven administrative categories: exact URLs, revision dates, version numbers, contact email addresses, exception form numbers, monetary fines and next-review dates. These are absent from the supplied database. They are narrower and more repetitive than a varied operational missing-information test, and deliberately name the policy. Some presuppose an exception process; correct responses must not assume that process exists. Six unrelated benefit/allowance questions were checked for absence from the database.

The assistant reviewed the recorded answers locally against the CSV. No model-assisted grading was executed. Scoring includes actual answer text plus missing-information statements. A correct answer must address the question, preserve relevant limits and approvals and acknowledge unavailable details where requested. A correct citation is a separate measure. For unrelated questions, an absent-policy response with no citation is correct; citations are summarized over the 294 policy-linked questions. Unsupported factual claims are judged strictly against the supplied database. Failing to retrieve a policy is incorrect, but not automatically an invented factual claim. All detailed CSV rows include the review rationale.

## Findings and retests

The initial full-dataset LLM response to question 40 added legal-hold obligations about alteration/destruction that are not explicit in the supplied one-sentence policy. Question 269 over-distinguished sales opportunities from sales leads, producing an incomplete answer. Both worked correctly on an unchanged repeat. The two original failures remain in initial results and are not replaced by favorable repeats. Repeats demonstrate generation variability, not a verified code fix. The vector run had no incorrect or unsupported answers under this rubric; that observation is not a guarantee of future accuracy.

The rules method initially missed many paraphrases and did not explicitly acknowledge absent administrative fields. Two functional fixes were made without design changes: exact policy-title mentions now receive stronger ranking, and explicit missing-field checks return an absence statement for the seven tested administrative categories when the original policy lacks that field. The entire rules set was retested. The initial and retest results are kept separate. Many unfamiliar paraphrases still fail; those limitations are reported rather than hidden with expected-answer lookups. No LLM prompt/model change was made.

## Measurement

LLM time is measured by the real backend and includes CSV loading, provider request, response parsing and reference validation. Vector time additionally includes saved-index loading, question embedding and exact cosine retrieval. Neither includes browser rendering or frontend queue wait. Four concurrent evaluation workers were used and question/method order was shuffled with seed 27; concurrency can influence provider/network latency. These are per-call backend processing benchmarks, not browser end-to-end or single-user service-level guarantees. The website's normal comparison calls remain sequential.

Rules time covers the actual JavaScript normalization, clarification and ranking functions in Node.js; retests additionally include the new deterministic answer-field check. It excludes CSV loading and DOM rendering. This runtime differs from the browser, so sub-millisecond comparisons should not be overinterpreted. Provider-reported generation token counts and question-embedding token counts are recorded separately, including reasoning tokens if reported. Do not add generation output and reasoning counts again to the provider's total. One-time saved-policy embedding creation is separate and the index was reused without regeneration. Benchmark creation and review work are not counted as runtime answer tokens.

## Limits

One response per question per LLM method was collected, with only two targeted repeat checks. The direct set previously informed rules tuning, and the administrative tests informed the new missing-field rules. Rules retest scores are development-set results, not independent holdout accuracy. Natural paraphrases are a stronger generalization test than direct wording, but the suite does not cover all possible questions, conflicting policies, prompt attacks or long conversation history. Future responses may vary. Zero observed unsupported claims does not establish zero risk. A human reviewer should independently spot-check the locally reviewed labels before submission.

## Files and use

testing/initial_results.csv preserves all 900 first-run answers and measures. testing/retest_results.csv contains 300 rules retests plus two LLM repeats. testing/summary.csv distinguishes initial results and retests. testing/policy_test_questions.csv contains the 300 questions used by the website. Reviewed CSV exports retain the answers, sources, measurements and review notes. Optional raw logs, evaluation scripts and code snapshots were removed during submission cleanup. The website shows the current rules retest beside the unchanged initial LLM results.

- Initial Rules-based search: 141/300 correct; 156/294 expected citations; 0/300 unsupported; 0/98 missing details handled; 0.681 ms; 0 LLM tokens; 0 embedding tokens.

- Initial LLM without a vector index: 298/300 correct; 294/294 expected citations; 1/300 unsupported; 98/98 missing details handled; 1428.694 ms; 3729.39 LLM tokens; 0 embedding tokens.

- Initial LLM with a vector index: 300/300 correct; 294/294 expected citations; 0/300 unsupported; 98/98 missing details handled; 1694.456 ms; 361.51 LLM tokens; 11.44 embedding tokens.

- Rules retest: 239/300 correct.

One-time policy-index creation: {'model': 'text-embedding-3-small', 'creation_tokens': 2589, 'creation_ms': 3670.67, 'created_at': '2026-10-27T13:00:53.724939+00:00'}


All methods share the testing folder. Combined CSVs retain the Method column. The initial scores above are historical; current rules results follow below.

## Current rules-based retest after word-search changes

All 300 prepared questions were rerun against the current search module. The runner now mirrors the website's multiple-word-match response and sources as well as ordinary answers. Exactly one answer/source result changed from the previous retest: question 128 (ninety-day probation) now returns the Probation Period Policy and its original 90-day sentence. It was checked locally against the CSV. The other 299 responses are identical, so their prior review labels were retained.

Current rules score: 240/300 correct; 234/294 correct policy citations; 0 unsupported factual claims; 98/98 missing details acknowledged; 6/6 unrelated questions handled. Mean Node.js processing time: 0.676 ms. LLM and embedding token usage remain zero. This is the same development test set, not a new holdout set. Both LLM methods were unchanged and were not rerun.

The website now shows this current rules retest beside the original unchanged LLM results, clearly labelled. Original first-run evidence and the current retest are retained. Optional intermediate backup files were removed during cleanup; earlier aggregate scores remain in the summary. Search-code SHA256: fd0cd834b8429c1b2555ea7972d89b41ee4644ab19145be610dfdb9374bb11b0.
