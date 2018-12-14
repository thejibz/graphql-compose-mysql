#!/usr/bin/env bash

# wait for mysql to start
chmod +x /tmp/setup/wait-for-it.sh
/tmp/setup/wait-for-it.sh localhost:3306 --timeout=30 --strict

# load data in mysql
cd /tmp/data/test_db/
mysql -uroot -p"$MYSQL_ROOT_PASSWORD" < /tmp/data/test_db/employees.sql