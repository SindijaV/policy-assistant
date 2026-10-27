"""Reusable exact vector index for the small policy dataset."""
import hashlib
import json
import math
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

MODEL = 'text-embedding-3-small'
INDEX = Path(__file__).resolve().parent / 'data/policy_vector_index.json'

def fingerprint(policies):
    return hashlib.sha256(json.dumps(policies, sort_keys=True, ensure_ascii=False).encode()).hexdigest()

def embed(texts, key):
    request = urllib.request.Request('https://api.openai.com/v1/embeddings',
        data=json.dumps({'model': MODEL, 'input': texts, 'encoding_format': 'float'}).encode(),
        headers={'Content-Type': 'application/json', 'Authorization': 'Bearer '+key}, method='POST')
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            data=json.load(response)
    except urllib.error.HTTPError as error:
        raise ValueError('Embedding request failed (HTTP '+str(error.code)+'). Check your OpenAI key, quota and embedding-model access.') from None
    except (urllib.error.URLError, TimeoutError, OSError):
        raise ValueError('Could not reach the embedding service. Check your internet connection.') from None
    vectors=[r['embedding'] for r in sorted(data['data'],key=lambda r:r['index'])]
    if len(vectors)!=len(texts) or not vectors or not all(len(v)==len(vectors[0]) and all(isinstance(x,(int,float)) and math.isfinite(x) for x in v) for v in vectors):
        raise ValueError('Embedding service returned invalid vectors.')
    return vectors,data.get('usage',{}).get('total_tokens')

def load_index(policies):
    if not INDEX.exists():
        raise ValueError('Vector index is missing. Run: python3 build_index.py')
    data=json.loads(INDEX.read_text())
    if data.get('model')!=MODEL or data.get('source_hash')!=fingerprint(policies):
        raise ValueError('Policies or embedding model changed. Rebuild with: python3 build_index.py')
    items=data.get('items',[])
    if len(items)!=len(policies) or [r.get('policy') for r in items]!=policies:
        raise ValueError('Vector index records do not match the CSV. Run: python3 build_index.py --rebuild')
    dims=data.get('dimensions')
    if not isinstance(dims,int) or not all(len(r.get('vector',[]))==dims and all(isinstance(x,(int,float)) and math.isfinite(x) for x in r['vector']) for r in items):
        raise ValueError('Vector index is damaged. Run: python3 build_index.py --rebuild')
    return data

def build_index(policies,key,rebuild=False):
    if INDEX.exists() and not rebuild:
        try:
            existing=load_index(policies)
            return {'reused':True,'count':len(existing['items']),'tokens':existing['creation_tokens']}
        except ValueError:
            pass
    started=time.perf_counter()
    texts=['Title: '+p['title']+'\nDepartment: '+p['department']+'\nCategory: '+p['category']+'\nPolicy: '+p['policy_text'] for p in policies]
    vectors,tokens=embed(texts,key)
    data={'model':MODEL,'source_hash':fingerprint(policies),'dimensions':len(vectors[0]),
          'created_at':datetime.now(timezone.utc).isoformat(),'creation_tokens':tokens,
          'creation_ms':round((time.perf_counter()-started)*1000,2),
          'items':[{'policy':p,'vector':v} for p,v in zip(policies,vectors)]}
    temporary=INDEX.with_suffix('.tmp')
    temporary.write_text(json.dumps(data,separators=(',',':')))
    temporary.replace(INDEX)
    return {'reused':False,'count':len(policies),'tokens':tokens}

def retrieve(question,policies,key,top_k=3):
    started=time.perf_counter();data=load_index(policies)
    vectors,tokens=embed([question],key);q=vectors[0]
    if len(q)!=data['dimensions']:raise ValueError('Embedding dimensions changed. Rebuild the index.')
    def similarity(v):
        norm=math.sqrt(sum(x*x for x in q)*sum(x*x for x in v))
        return sum(a*b for a,b in zip(q,v))/norm if norm else 0
    matches=sorted([{'policy':r['policy'],'similarity':similarity(r['vector'])} for r in data['items']],key=lambda r:(-r['similarity'],r['policy']['title']))[:top_k]
    return matches,tokens,round((time.perf_counter()-started)*1000,2)
