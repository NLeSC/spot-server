#!/usr/bin/env python3

from pathlib import Path
import argparse
from subprocess import call
import os
import sys
import json

import pandas as pd
from sqlalchemy import create_engine
from tqdm import tqdm

def chunker(seq, size):
    # from http://stackoverflow.com/a/434328
    return (seq[pos:pos + size] for pos in range(0, len(seq), size))

def uploadCSV(tableName='spot_data', fileName="data.csv", columnName='dataset', columnVal=''):
    pg_engine = create_engine(connect_str)
    df = pd.read_csv(fileName)

    chunksize = int(len(df) / 20) # 5%
    if chunksize == 0:
        chunksize = len(df)
    print("Total data length: {}, chunksize: {}".format(len(df), chunksize))

    df.columns = map(str.lower, df.columns.str.strip())
    df.insert(0, columnName, f'{columnVal}')
    df.to_csv(fileName, index=False)
    with tqdm(total=len(df)) as pbar:
        for i, chunked_df in enumerate(chunker(df, chunksize)):
            # if_exists = "replace" if i == 0 else "append"
            # print(if_exists)
            chunked_df.to_sql(tableName, con=pg_engine, if_exists="append", index=False)
            pbar.update(chunksize)
            # tqdm._instances.clear()


# Create the parser
parser = argparse.ArgumentParser(prog='spot_init',
                                 usage='%(prog)s [options] path',
                                 description='Manage SPOT server.',
                                 epilog='Happy SPOTting! :)')

action_group = parser.add_mutually_exclusive_group(required=True)

# Add the arguments
action_group.add_argument('-i',
                    '--import',
                    dest='import_mode',
                    action='store_true',
                    help='import a new dataset')

action_group.add_argument('-s',
                    '--server',
                    dest='server_mode',
                    action='store_true',
                    help='start the server')

action_group.add_argument('-m',
                    '--merge',
                    dest='merge_session',
                    action='store_true',
                    help='merge session files')

# parser.add_argument('Path',
#                     metavar='path',
#                     type=str,
#                     help='the path to datasets')

# parser.add_argument('-a',
#                     action='store',
#                     choices=['head', 'tail'],
#                     required=True)

parser.add_argument('-f',
                    '--file',
                    action='append',
                    type=str,
                    nargs='+',
                    metavar='data.(csv|json)',
                    dest='file_list',
                    help='the path to dataset')

parser.add_argument('--name',
                    type=str,
                    metavar='data_name',
                    dest='data_name',
                    default='Uploaded dataset',
                    help='dataset name')

parser.add_argument('--description',
                    type=str,
                    metavar='description',
                    dest='description',
                    default='No description',
                    help='dataset description')

parser.add_argument('--session',
                    type=str,
                    metavar='session.json',
                    dest='session_file',
                    help='the path to session file')

parser.add_argument('--table',
                    type=str,
                    metavar='data_table',
                    dest='table_name',
                    default='spot_data',
                    help='database table name')

# Execute the parse_args() method
args = parser.parse_args()
# print(vars(args))

import_mode = args.import_mode
server_mode = args.server_mode
merge_session = args.merge_session
file_list = args.file_list
session_file = args.session_file
table_name = args.table_name
data_name = args.data_name
description = args.description

import_script = '/spot/spot-server/scripts/spot-import.js'
server_script = '/spot/spot-server/scripts/spot-server.js'
connect_str = 'postgres://spot:spot@db/spot'
file_type = '--csv'

if (import_mode):
    if (file_list):
        for i, file_name in enumerate(file_list):
            print('Importing...')
            file_name = file_name[0]
            print(file_name)
            if os.path.isfile(file_name) and os.path.exists(file_name):
                dataset_name = Path(file_name).resolve().stem
                print("Dataset name: {}".format(dataset_name))
                uploadCSV(tableName=table_name, fileName=file_name, columnName='dataset', columnVal=dataset_name)
                call(['node', '--experimental-modules', import_script, '-c', connect_str, '-t', table_name, '-s', file_name + '_session.json', '-d', description, file_type, '-f', file_name, '-n', data_name])
    else:
        print('No filename was given. Exiting.')
        sys.exit()
elif (merge_session):
    if (file_list):
        data = {}
        for i, file_name in enumerate(file_list):
            print('Importing...')
            print(file_name)
            file_name = file_name[0]

            with open(file_name) as json_file:
                session_data = json.load(json_file)

                if i == 0:
                    print(i)
                    data = session_data
                    pass

                # jstr = json.dumps(session_data, sort_keys=True, ensure_ascii=False, indent=4)
                # print(jstr)

                data["datasets"].extend(session_data["datasets"])
                for d in session_data['datasets']:
                    print('Name: ' + d['name'])
                    print('id  : ' + d['id'])
                    print('URL: ' + d['URL'])
                    print('databaseTable: ' + d['databaseTable'])
                    print('description: ' + d['description'])
                    print('')

        with open(session_file, 'w') as outfile:
            json.dump(data, outfile)

elif (server_mode):
    call(["node", server_script, '-c', connect_str, '-s', session_file, '-w', '/spot/app'])
else:
    print('Unknown mode. Exiting.')
    sys.exit()