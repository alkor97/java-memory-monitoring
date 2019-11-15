
ELEVATION='sudo'
JAVA_APP_NAME='Bootstrap'

PID=`${ELEVATION} jps | grep ${JAVA_APP_NAME} | awk '{print $1;}'`
TIMESTAMP=`date +'%F %T %Z'`

HEAP_LOG=/tmp/my-heap-${PID}.log
HISTO_LOG=/tmp/my-histo-${PID}.log

printf "\n*** ${TIMESTAMP} ***\n" >>${HEAP_LOG}
${ELEVATION} navteq jmap -heap ${PID} >>${HEAP_LOG}

printf "\n*** ${TIMESTAMP} ***\n" >>${HISTO_LOG}
${ELEVATION} jmap -histo ${PID} >>${HISTO_LOG}
