#!/bin/bash

echo "=========================================="
echo "Building spot-server"
cd /spot/spot-server && npm install

echo "=========================================="
echo "Wait"
while :
do
	echo "Press [CTRL+C] to stop.."
	sleep 1
done



cp /spot/test_data/data1.csv /spot/test_data/data1.csv.bck
cp /spot/test_data/data2.csv /spot/test_data/data2.csv.bck

cp /spot/test_data/data1.csv.bck /spot/test_data/data1.csv && cp /spot/test_data/data2.csv.bck /spot/test_data/data2.csv


/spot/spot_init.py -i


vim /spot/spot-server/scripts/spot-import.js


psql 'postgres://spot:spot@db/spot'
DROP TABLE IF EXISTS spot_data;
SELECT * FROM spot_data;



# echo "=========================================="
# echo "Import test dataset: /spot/test_data.csv"
# node /spot/spot-server/scripts/spot-import.js -c 'postgres://spot:spot@db/spot' -t 'db_test' -s '/spot/db_session.json' -d 'DB test' --csv -f '/spot/test_data/fixed_ewkinos.csv'
# node /spot/spot-server/scripts/spot-import.js -c 'postgres://spot:spot@db/spot' -t 'db_test' -s '/spot/db_session.json' -d 'DB test' --csv -f '/spot/test_data/fixed_pmssm_8tev.csv'

# echo "=========================================="
# echo "Serve test session: /spot/db_session.json"
# node /spot/spot-server/scripts/spot-server.js -c 'postgres://spot:spot@db/spot' -s '/spot/db_session.json' -w /spot/app