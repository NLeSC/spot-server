#!/usr/bin/env python3
# spot_init.py

from pathlib import Path
import argparse
from subprocess import call
import os
import sys

import pandas as pd
from sqlalchemy import create_engine

def uploadCSV(tableName='spot_data', fileName="data.csv", columnName='dataset', columnVal=''):
    pg_engine = create_engine(connect_str)
    df = pd.read_csv(fileName)
    df.columns = map(str.lower, df.columns.str.strip())
    df.insert(0, columnName, f'"{columnVal}"')
    df.to_csv(fileName, index=False)
    df.to_sql(tableName, con=pg_engine, if_exists='append')

# Create the parser
parser = argparse.ArgumentParser(description='List the content of a folder')

# Create the parser
parser = argparse.ArgumentParser(prog='spot_init',
                                 usage='%(prog)s [options] path',
                                 description='List the content of a folder',
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


# Execute the parse_args() method
args = parser.parse_args()
# print(vars(args))

import_mode = args.import_mode
server_mode = args.server_mode
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
        # print(file_list)
        for file_name in file_list:
            # print(file_name)
            file_name = file_name[0]
            if os.path.isfile(file_name) and os.path.exists(file_name):
                dataset_name = Path(file_name).resolve().stem
                print(dataset_name)
                uploadCSV(tableName=table_name, fileName=file_name, columnName='dataset', columnVal=dataset_name)
                call(["node", import_script, '-c', connect_str, '-t', table_name, '-s', session_file, '-d', description, file_type, '-f', file_name, '-n', data_name])
    else:
        print('No filename was given. Exiting.')
        sys.exit()
elif (server_mode):
    call(["node", server_script, '-c', connect_str, '-s', session_file, '-w', '/spot/app'])
else:
    print('Unknown mode. Exiting.')
    sys.exit()