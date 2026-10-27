import argparse
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from app import settings, policy_rows
from vector_search import build_index

if __name__=='__main__':
    parser=argparse.ArgumentParser(description='Generate policy embeddings once and reuse them.')
    parser.add_argument('--rebuild',action='store_true')
    args=parser.parse_args()
    key=settings()['OPENAI_API_KEY']
    if not key:raise SystemExit('Save OPENAI_API_KEY in .env first.')
    try:
        result=build_index(policy_rows(),key,args.rebuild)
    except Exception as error:
        raise SystemExit('Index creation failed: '+str(error))
    print(('Reused' if result['reused'] else 'Created')+' index for '+str(result['count'])+' policies.')
    print('One-time creation tokens: '+str(result['tokens']))
