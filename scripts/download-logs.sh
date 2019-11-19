
SERVER=$1
PID=$2

HOST=${!SERVER}
DIR=./histo/${SERVER}

mkdir -p ${DIR}
scp ${HOST}:/tmp/my-heap-${PID}.log ${DIR}
scp ${HOST}:/tmp/my-histo-${PID}.log ${DIR}
