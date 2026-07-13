"""
Export SQLite data as per-table JSON arrays for D1 import.

Output:  one JSON file per table in  migrations/data/<table>.json
         and a combined  all.json
"""

import json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from prisma import Prisma

OUT = os.path.join(os.path.dirname(__file__), 'data')
os.makedirs(OUT, exist_ok=True)

async def export():
    prisma = Prisma()
    await prisma.connect()

    models = ['user', 'customer', 'invoicounter', 'payment', 'invoice',
              'job', 'rosteritem', 'uploadedfile', 'generatedoutput', 'messagetemplate']

    all_data = {}
    for model in models:
        table = getattr(prisma, model)
        rows = await table.find_many()
        records = [r.model_dump(mode='json') for r in rows]
        all_data[model] = records
        fp = os.path.join(OUT, f'{model}.json')
        with open(fp, 'w') as f:
            json.dump(records, f, default=str, indent=2)
        print(f'{model}: {len(records)} records → {fp}')

    fp_all = os.path.join(OUT, 'all.json')
    with open(fp_all, 'w') as f:
        json.dump(all_data, f, default=str, indent=2)
    print(f'\nTotal: {sum(len(v) for v in all_data.values())} records → {fp_all}')

    await prisma.disconnect()

if __name__ == '__main__':
    import asyncio
    asyncio.run(export())
