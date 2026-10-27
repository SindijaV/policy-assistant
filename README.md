# Company Policy Assistant

Compare rules-based search, an LLM using the complete policy database, and an LLM using a saved vector index.

## Start the website

From the project folder run `python3 app.py --port 8000`, then open http://127.0.0.1:8000. Keep the terminal open; Control+C stops the server. Restart after Python code changes. Use another port if necessary.

Keep your real API key in `.env`, excluded from Git. `.env.example` contains placeholders only. Both LLM methods use the same OPENAI_MODEL and shared generation instructions. The server exposes only an explicit list of public website files.

## Folders

- `static/`: browser JavaScript and rules-based search (`app.js`, `search.mjs`).
- `templates/`: the HTML page and its styling (`index.html`).
- `data/`: original policy CSV and saved vector index.
- `testing/`: questions, reviewed initial results, current retest results, a comparison summary and an evaluation report for all three methods.
- `app.py`: starts the website and contains the shared AI connection, settings, prompt, validation and both LLM context choices.
- `vector_search.py`: embedding and retrieval functions.
- `build_index.py`: creates or reuses the saved vector index.
- `requirements.txt`: records that no external Python packages are required.
- `.env.example`: placeholder configuration; your actual key stays private in `.env`.

## Index and testing

`python3 build_index.py` reuses a valid index; add `--rebuild` to regenerate embeddings deliberately. Regeneration consumes API tokens. Each vector question uses a question embedding and retrieves three policies.

The submission retains five evaluation files: policy_test_questions.csv, initial_results.csv, retest_results.csv, summary.csv and evaluation_report.md. Optional raw logs, evaluation scripts and the original code snapshot were removed during submission cleanup. Prepared rules-retrieval checks can still be run in the website.

Read `testing/evaluation_report.md` for the methodology and limitations. There are 300 questions: 98 direct, 98 paraphrased, 98 missing-detail and six unrelated. Initial results and retests remain separate. Historical scores do not automatically change when search code is updated. Local review labels should be independently spot-checked.

LLM timings include backend processing and provider calls; vector timings include retrieval and question embedding. Browser rendering and queue wait are excluded. Rules benchmark timing uses Node.js. Actual provider generation and embedding tokens are separate, with one-time index creation excluded from per-question counts. Website benchmark results are distinct from browser usage history.

## Deployment

Start command: `python3 app.py --host 0.0.0.0`. The hosting service supplies PORT. Set OPENAI_API_KEY in hosting secrets and OPENAI_MODEL to gpt-4.1-mini. Include the saved data/policy_vector_index.json. Never upload .env.

The host supplies HTTPS; same-host HTTPS requests are accepted. If its proxy changes the Host header, set PUBLIC_ORIGIN to your exact public origin (such as https://your-app.example.com, without a path).

Public testing is pending deployment: run Compare all three and each individual method; check answers, sources, time and tokens, and try a missing-detail question.
