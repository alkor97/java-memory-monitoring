# Java memory monitoring scripts and tools

In order to setup regular monitoring one would need to configure the following:
- copy log-jvm-info.sh to target machine
    - it might be required to update the script, eg. to update Java application name
- configure cron to run the script on regular manner
- there are two outputs generated:
    - heap space usage (output of ```jmat -heap```) is appended to ```/tmp/my-heap-<PID>.log```
    - histogram of instantiated classes (output of ```jmat -histo```) is appended to ```/tmp/my-histo-<PID>.log```

Once output files are filled with several pieces of information, one would need to download it and put into ```./histo/<server_name>/<pid>/``` directory.

Processing script's dependencies must be installed with:
```
    npm install
```

Then one could run the processing script to perform some analysis with:
```
    npm start <server_name> <pid>
```

Resulting old generation heap space usage is written to ```./histo/<server_name>/heap-<pid>.log```.

Time trends of classes' instances number and memory usage are generated to ```./histo/<server_name>/histo-<pid>.html```.
