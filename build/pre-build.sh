#!/bin/bash
#$0 - The name of the Bash script.
#$1 - $9 - The first 9 arguments to the Bash script. (As mentioned above.)
#$# - How many arguments were passed to the Bash script.
#$@ - All the arguments supplied to the Bash script.
#$? - The exit status of the most recently run process.
#$$ - The process ID of the current script.
#$USER - The username of the user running the script.
#$HOSTNAME - The hostname of the machine the script is running on.
#$SECONDS - The number of seconds since the script was started.
#$RANDOM - Returns a different random number each time is it referred to.
#$LINENO - Returns the current line number in the Bash script.

# This script is executed as part of the bin/build.sh script.
# To use as a standalone script you need to export the $ENV_FILE variable 
# with the path to the .env file you want to use.

sh $REACTORY_SERVER/src/modules/reactory-telemetry/build/prometheus.sh
sh $REACTORY_SERVER/src/modules/reactory-telemetry/build/grafana.sh